const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { Surat, User, DataPribadi, RiwayatSurat, DokumenLampiran, sequelize } = require("../../models/Persuratan");
const TrxUserJabatanUnit = require("../../models/TrxUserJabatanUnit");
const Jabatan = require("../../models/master/Jabatan");
const Unit = require("../../models/master/Unit");

const { compileSuratPengunduranDiri, compileSuratCutiAkademik } = require("../../utils/persuratanHelper");

/**
 * Mengambil TTD user sebagai Base64 dari file lokal.
 * @param {string} ttdFilename - nama file TTD dari tb_data_pribadi
 * @returns {string|null} data URI base64 atau null jika tidak ada
 */
const getTtdBase64 = (ttdFilename) => {
  if (!ttdFilename) return null;
  try {
    const ttdPath = path.join(__dirname, "../../public/ttd", ttdFilename);
    if (!fs.existsSync(ttdPath)) return null;
    const buffer = fs.readFileSync(ttdPath);
    const ext = path.extname(ttdFilename).replace(".", "") || "png";
    return `data:image/${ext};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("[TTD Base64 Error]:", err.message);
    return null;
  }
};

const safeJsonParse = (data) => {
  if (!data) return {};
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("[SafeParse Error]:", error.message);
    return {};
  }
};

class SuratController {
  static index = async (req, res) => {
    try {
      let { limit, page, mode, status } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      const pagelimit = getPagination(limit, page);

      // ── Kondisi dasar: tampilkan surat asal ATAU surat disposisi ─────────────
      // Logika:
      //   parent_id: null           → surat asal dari mahasiswa ✅
      //   root_surat_id: [ada]      → surat disposisi untuk pejabat ✅
      //   parent_id: [ada] + root_surat_id: null → reply ChatRoom ❌ (disembunyikan)
      const condition = {
        deleted_at: null,
        [Op.and]: [
          {
            [Op.or]: [
              { parent_id: null },
              { root_surat_id: { [Op.ne]: null } },
            ],
          },
        ],
      };

      // ── Filter berdasarkan mode (inbox/outbox/semua) ──────────────────────────
      if (mode === "inbox") {
        condition.penerima_id = req.user.user_id;
      } else if (mode === "outbox") {
        condition.user_id = req.user.user_id;
      } else {
        condition[Op.and].push({
          [Op.or]: [{ user_id: req.user.user_id }, { penerima_id: req.user.user_id }],
        });
      }

      // ── Filter berdasarkan status (opsional) ──────────────────────────────────
      // Digunakan oleh frontend filter "Kondisi Status"
      // Contoh: ?mode=inbox&status=Disposisi
      if (status) {
        condition.status = status;
      }

      const data = await Surat.findAndCountAll({
        where: condition,
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        order: [["updated_at", "DESC"]],
        attributes: { exclude: ["deleted_at"] },
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: ["npm", "email"],
            include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          },
          {
            model: User,
            as: "Penerima",
            attributes: ["npm", "email", "role"],
            include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          },
        ],
      });

      return response(res, true, "success", { totalData: data.count, rows: data.rows });
    } catch (error) {
      return response(res, false, error.message);
    }
  };

  static create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      let { penerima_id, jenis_surat, form_data, parent_id, nomor_surat, nama_aktor } = req.body;
      const userRole = req.user.role?.toLowerCase();
      const isReply = !!parent_id;

      const allowedSuratMhs = ["surat pengunduran diri", "surat pengajuan cuti"];

      if (!isReply) {
        if (userRole !== "mahasiswa") {
          await t.rollback();
          return response(res, false, "Akses ditolak. Modul pengajuan dokumen ini hanya dikhususkan untuk Mahasiswa.");
        }

        if (!allowedSuratMhs.includes(jenis_surat?.toLowerCase())) {
          await t.rollback();
          return response(res, false, "Jenis pengajuan tidak valid atau tidak didukung oleh modul mahasiswa.");
        }

        // ✅ Validasi TTD hanya untuk Surat Pengunduran Diri
        // (Surat Cuti tidak butuh TTD mahasiswa — yang TTD di sana adalah Kaprodi)
        if (jenis_surat?.toLowerCase() === "surat pengunduran diri") {
          const dataPribadi = await DataPribadi.findOne({
            where: { user_id: req.user.user_id },
            attributes: ["ttd", "nama_lengkap"],
            transaction: t,
          });

          const namaUser = dataPribadi?.nama_lengkap || req.user.username || "Pengguna";
          const npmUser = req.user.npm || req.user.nidn || req.user.user_id;
          const roleUser = req.user.role || "Pengguna";

          if (!dataPribadi || !dataPribadi.ttd) {
            await t.rollback();
            return response(
              res,
              false,
              `Pengajuan gagal: Akun atas nama "${namaUser}" (${npmUser} - ${roleUser}) belum memiliki tanda tangan digital. Silakan buka aplikasi TIAS Mobile → menu Profil → Tanda Tangan Digital, lalu buat tanda tangan Anda sebelum mengajukan surat.`
            );
          }
        }

        const adminUser = await User.findOne({
          where: { role: "Admin" },
          transaction: t,
        });

        if (!adminUser) {
          await t.rollback();
          return response(res, false, "Gagal mengirim: Akun Admin TU belum dikonfigurasi di sistem.");
        }

        penerima_id = adminUser.user_id;
      }

      const finalData = {
        user_id: req.user.user_id,
        penerima_id: penerima_id,
        parent_id: parent_id || null,
        jenis_surat,
        nomor_surat: nomor_surat || null,
        status: "Sent",
        form_data: safeJsonParse(form_data),
      };

      const save = await Surat.create(finalData, { transaction: t });

      if (req.files && req.files.length > 0) {
        const lampiranData = req.files.map((file) => ({
          surat_id: save.id,
          nama_file: file.originalname,
          file_url: file.filename,
        }));
        await DokumenLampiran.bulkCreate(lampiranData, { transaction: t });
      }

      if (parent_id) {
        const parentSurat = await Surat.findByPk(parent_id, { transaction: t });
        if (parentSurat && String(parentSurat.penerima_id) === String(req.user.user_id)) {
          await parentSurat.update({ status: "Replied" }, { transaction: t });
        }
      }

      await RiwayatSurat.create(
        {
          surat_id: save.id,
          status: "Sent",
          catatan: isReply ? `Pesan balasan dikirimkan. Dilakukan oleh: ${nama_aktor || "Pengguna"}` : `Pengajuan dokumen mahasiswa berhasil dibuat. Dilakukan oleh: ${nama_aktor || "Pengguna"}`,
        },
        { transaction: t },
      );

      await t.commit();

      const fullData = await Surat.findOne({
        where: { id: save.id },
        include: [{ model: DokumenLampiran }],
      });

      return response(res, true, "Surat berhasil dikirim", fullData);
    } catch (error) {
      await t.rollback();
      return response(res, false, error.message);
    }
  };

  static updateStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { status, catatan } = req.body;

      // Validasi status yang diizinkan lewat endpoint ini
      const allowedStatusUpdate = ["Disetujui", "Ditolak", "Archived"];
      if (!allowedStatusUpdate.includes(status)) {
        await t.rollback();
        return response(res, false, `Status tidak valid. Gunakan salah satu dari: ${allowedStatusUpdate.join(", ")}`);
      }

      const data = await Surat.findByPk(id, { transaction: t });
      if (!data) {
        await t.rollback();
        return response(res, false, "Data tidak ditemukan");
      }

      // Hanya penerima saat ini yang boleh update status
      if (String(data.penerima_id) !== String(req.user.user_id)) {
        await t.rollback();
        return response(res, false, "Akses ditolak. Hanya penerima saat ini yang dapat mengubah status surat.");
      }

      let currentFormData = safeJsonParse(data.form_data);

      await data.update(
        { status, catatan_pejabat: catatan },
        { transaction: t },
      );

      await RiwayatSurat.create(
        {
          surat_id: id,
          status,
          catatan: catatan || `Status dokumen diperbarui menjadi ${status}`,
        },
        { transaction: t },
      );

      // ── Auto-update Root Surat Mahasiswa ─────────────────────────────────────
      // Jika surat ini adalah hasil disposisi (punya root_surat_id),
      // maka update status surat asal mahasiswa agar mahasiswa bisa tracking
      if (data.root_surat_id && (status === "Disetujui" || status === "Ditolak")) {
        const rootSurat = await Surat.findByPk(data.root_surat_id, { transaction: t });
        if (rootSurat) {
          await rootSurat.update(
            {
              status,
              catatan_pejabat: catatan || `Keputusan akhir: ${status}`,
            },
            { transaction: t },
          );

          await RiwayatSurat.create(
            {
              surat_id: rootSurat.id,
              status,
              catatan: `Keputusan akhir diterima dari rantai disposisi: ${status}. ${catatan || ""}`.trim(),
            },
            { transaction: t },
          );
        }
      }

      await t.commit();

      // ── Generate PDF jika status Disetujui ───────────────────────────────────
      if (status === "Disetujui") {
        const htmlPdf = require("html-pdf-node");

        const formatTanggal = new Date().toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        let htmlDocumentString = "";

        if (data.jenis_surat?.toLowerCase() === "surat pengunduran diri") {
          const dataPribadiMhs = await DataPribadi.findOne({
            where: { user_id: data.user_id },
            attributes: ["ttd"],
          });
          const ttdMhsBase64 = getTtdBase64(dataPribadiMhs?.ttd);
          htmlDocumentString = await compileSuratPengunduranDiri(data, formatTanggal, ttdMhsBase64);

        } else if (data.jenis_surat?.toLowerCase() === "surat pengajuan cuti") {
          const kaprodiJabatan = await TrxUserJabatanUnit.findOne({
            include: [
              {
                model: Jabatan,
                as: "jabatan",
                where: { nama_jabatan: "Ketua Program Studi" },
                attributes: ["nama_jabatan"],
              },
              {
                model: Unit,
                as: "unit",
                where: { code: "FT_TI" },
                attributes: ["code", "nama_unit"],
              },
              {
                model: DataPribadi,
                as: "personal_data",
                attributes: ["ttd", "nama_lengkap"],
              },
            ],
          });

          const ttdKaprodiBase64 = getTtdBase64(kaprodiJabatan?.personal_data?.ttd);
          const namaKaprodi = kaprodiJabatan?.personal_data?.nama_lengkap || "Ketua Program Studi";
          htmlDocumentString = await compileSuratCutiAkademik(data, formatTanggal, ttdKaprodiBase64, namaKaprodi);
        }

        if (htmlDocumentString) {
          const folderPath = path.join(__dirname, "../../public/generated-pdf");
          if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

          const fileName = `Surat_${data.jenis_surat.replace(/\s+/g, "_")}_${data.id}.pdf`;
          const fileOutputPath = path.join(folderPath, fileName);
          const options = { format: "A4", margin: { top: "40px", right: "50px", bottom: "40px", left: "50px" } };

          const pdfBuffer = await new Promise((resolve, reject) => {
            htmlPdf.generatePdf({ content: htmlDocumentString }, options, (err, buffer) => {
              if (err) return reject(err);
              resolve(buffer);
            });
          });

          fs.writeFileSync(fileOutputPath, pdfBuffer);
          currentFormData.pdf_url = `/generated-pdf/${fileName}`;
          await Surat.update({ form_data: currentFormData }, { where: { id } });

          // Juga update pdf_url di root surat agar mahasiswa bisa download
          if (data.root_surat_id) {
            const rootSurat = await Surat.findByPk(data.root_surat_id);
            if (rootSurat) {
              const rootFormData = safeJsonParse(rootSurat.form_data);
              rootFormData.pdf_url = currentFormData.pdf_url;
              await Surat.update({ form_data: rootFormData }, { where: { id: data.root_surat_id } });
            }
          }
        }
      }

      return response(res, true, `Status berhasil diperbarui menjadi ${status}`, {
        pdf_url: currentFormData.pdf_url || null,
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      return response(res, false, error.message);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await Surat.findOne({
        where: { id, deleted_at: null },
        include: [
          { model: User, as: "Pengirim", attributes: ["npm", "email"], include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }] },
          { model: User, as: "Penerima", attributes: ["npm", "email", "role"], include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }] },
          { model: DokumenLampiran },
        ],
      });

      if (!data) return response(res, false, "Data tidak ditemukan");

      // ── Auto mark as Read ─────────────────────────────────────────────────────
      if (String(data.penerima_id) === String(req.user.user_id) && data.status === "Sent") {
        const t = await sequelize.transaction();
        try {
          await data.update({ status: "Read" }, { transaction: t });

          const roleName = data.Penerima?.role ? data.Penerima.role.toUpperCase() : "USER";
          const identitasPenerima = data.Penerima?.npm || data.Penerima?.user_id || "Tanpa NPM";
          const penerimaName = `${data.Penerima?.personal_data?.nama_lengkap || "Pengguna"} (${identitasPenerima} - ${roleName})`;

          await RiwayatSurat.create(
            {
              surat_id: id,
              status: "Read",
              catatan: `Dokumen telah dibuka dan dibaca. Dilakukan oleh: ${penerimaName}`,
            },
            { transaction: t },
          );

          await t.commit();
        } catch (err) {
          await t.rollback();
          throw err;
        }
      }

      // ── Bangun Disposisi Chain dari DB ────────────────────────────────────────
      // Chain = urutan semua surat dalam satu rantai disposisi
      // Dibangun dari query DB (root_surat_id), bukan dari form_data — lebih reliable
      let disposisiChain = [];
      const rootId = data.root_surat_id || data.id;

      // Ambil semua surat yang punya root_surat_id yang sama (surat anak/disposisi)
      const chainSurats = await Surat.findAll({
        where: { root_surat_id: rootId, deleted_at: null },
        attributes: ["id", "status", "created_at", "updated_at", "catatan_pejabat", "user_id", "penerima_id"],
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: ["npm", "role"],
            include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          },
          {
            model: User,
            as: "Penerima",
            attributes: ["npm", "role"],
            include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          },
        ],
        order: [["created_at", "ASC"]],
      });

      // Format chain: tampilkan dari → ke per langkah disposisi
      disposisiChain = chainSurats.map((s) => ({
        surat_id: s.id,
        dari: {
          nama: s.Pengirim?.personal_data?.nama_lengkap || "–",
          npm: s.Pengirim?.npm || "–",
          role: s.Pengirim?.role || "–",
        },
        ke: {
          nama: s.Penerima?.personal_data?.nama_lengkap || "–",
          npm: s.Penerima?.npm || "–",
          role: s.Penerima?.role || "–",
        },
        status: s.status,
        catatan: s.catatan_pejabat || null,
        tanggal: s.created_at,
      }));

      // ── Surat balasan (reply thread) ──────────────────────────────────────────
      // Hanya ambil reply murni dari ChatRoom (parent_id ada, root_surat_id null)
      // Surat disposisi (root_surat_id ada) TIDAK masuk ke sini agar tidak
      // mencemari ruang percakapan dengan lampiran disposisi
      const replies = await Surat.findAll({
        where: { 
          parent_id: id, 
          root_surat_id: null,  // filter: hanya reply ChatRoom, bukan surat disposisi
          deleted_at: null 
        },
        include: [
          { model: User, as: "Pengirim", attributes: ["npm", "email"] },
          { model: DokumenLampiran },
        ],
        order: [["created_at", "ASC"]],
      });

      return response(res, true, "Success", {
        ...data.toJSON(),
        disposisi_chain: disposisiChain,
        Replies: replies,
      });
    } catch (error) {
      return response(res, false, error.message);
    }
  };

  static getTracking = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await RiwayatSurat.findAll({
        where: { surat_id: id },
        order: [["created_at", "ASC"]],
      });
      return response(res, true, "Berhasil ambil riwayat", data);
    } catch (error) {
      return response(res, false, error.message);
    }
  };

  static delete = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await Surat.findByPk(id);
      if (!data) return response(res, false, "Data tidak ditemukan");
      if (data.user_id !== req.user.user_id) return response(res, false, "Akses ditolak.");

      await data.update({ deleted_at: new Date() });
      return response(res, true, "Berhasil menghapus surat");
    } catch (error) {
      return response(res, false, error.message);
    }
  };

  static getQr = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await Surat.findOne({
        where: { id, deleted_at: null },
        attributes: ["id", "jenis_surat", "nomor_surat", "status", "created_at", "updated_at", "form_data"],
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: ["npm", "email"],
            include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          },
          {
            model: User,
            as: "Penerima",
            attributes: ["npm", "email", "role"],
            include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          },
        ],
      });

      if (!data) return response(res, false, "Dokumen tidak ditemukan atau telah dihapus.");

      return response(res, true, "Data QR berhasil dimuat", data);
    } catch (error) {
      return response(res, false, error.message);
    }
  };

  static disposisi = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { target_penerima_id, catatan_disposisi } = req.body;

      const oldSurat = await Surat.findOne({
        where: { id, deleted_at: null },
        include: [{ model: DokumenLampiran }],
        transaction: t,
      });

      if (!oldSurat) {
        await t.rollback();
        return response(res, false, "Surat tidak ditemukan");
      }
      if (String(oldSurat.penerima_id) !== String(req.user.user_id)) {
        await t.rollback();
        return response(res, false, "Hanya penerima saat ini yang dapat mendisposisikan surat.");
      }
      if (String(target_penerima_id) === String(req.user.user_id)) {
        await t.rollback();
        return response(res, false, "Ditolak: Anda tidak dapat mendisposisikan surat kepada diri Anda sendiri.");
      }

      // Validasi target user ada di sistem
      const targetUser = await User.findByPk(target_penerima_id, {
        include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
        transaction: t,
      });
      if (!targetUser) {
        await t.rollback();
        return response(res, false, "Target penerima disposisi tidak ditemukan.");
      }

      // ── Tentukan root_surat_id ────────────────────────────────────────────────
      // Jika surat ini sudah hasil disposisi → pakai root_surat_id yang sama
      // Jika surat ini adalah surat asal (dari mahasiswa) → root = id surat ini
      const rootSuratId = oldSurat.root_surat_id || oldSurat.id;

      let disposisiFile = null;
      let newLampiransData = [];

      if (oldSurat.DokumenLampirans && oldSurat.DokumenLampirans.length > 0) {
        newLampiransData = oldSurat.DokumenLampirans.map((l) => ({
          nama_file: l.nama_file,
          file_url: l.file_url,
        }));
      }

      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        disposisiFile = { nama_file: file.originalname, file_url: file.filename };
        newLampiransData.push(disposisiFile);
      }

      // ── Identitas aktor & target ──────────────────────────────────────────────
      const pelakuUser = await User.findByPk(req.user.user_id, {
        include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
        transaction: t,
      });

      const pelakuNama = pelakuUser?.personal_data?.nama_lengkap || pelakuUser?.username || "Sistem";
      const pelakuIdentitas = pelakuUser?.npm || req.user.user_id;
      const pelakuRole = pelakuUser?.role ? pelakuUser.role.toUpperCase() : "USER";
      const identitasAktorLengkap = `${pelakuNama} (${pelakuIdentitas} - ${pelakuRole})`;

      const targetName = targetUser?.personal_data?.nama_lengkap || targetUser?.username || "Pengguna";
      const targetIdentitas = targetUser?.npm || target_penerima_id;
      const targetRole = targetUser?.role ? targetUser.role.toUpperCase() : "USER";
      const identitasTargetLengkap = `${targetName} (${targetIdentitas} - ${targetRole})`;

      // ── Update history_disposisi di form_data ─────────────────────────────────
      const currentHistory = oldSurat.form_data?.history_disposisi || [];
      currentHistory.push({
        surat_id: oldSurat.id,
        aktor: identitasAktorLengkap,
        target_penerima: identitasTargetLengkap,
        catatan: catatan_disposisi || "Tanpa catatan disposisi",
        tanggal: new Date().toISOString(),
        lampiran: disposisiFile,
      });

      const formDataBaru = {
        ...oldSurat.form_data,
        history_disposisi: currentHistory,
      };

      // ── Update surat lama: status → Disposisi ────────────────────────────────
      await oldSurat.update(
        {
          status: "Disposisi",
          catatan_pejabat: `Surat didisposisikan ke: ${identitasTargetLengkap}`,
          form_data: formDataBaru,
        },
        { transaction: t },
      );

      await RiwayatSurat.create(
        {
          surat_id: oldSurat.id,
          status: "Disposisi",
          catatan: `Surat didisposisikan ke ${identitasTargetLengkap}. Catatan: ${catatan_disposisi || "-"}. Dilakukan oleh: ${identitasAktorLengkap}`,
        },
        { transaction: t },
      );

      // ── Update status root surat mahasiswa → Disposisi ───────────────────────
      // Agar mahasiswa bisa melihat bahwa suratnya sedang dalam proses disposisi
      if (rootSuratId !== oldSurat.id) {
        const rootSurat = await Surat.findByPk(rootSuratId, { transaction: t });
        if (rootSurat) {
          await rootSurat.update(
            { status: "Disposisi", form_data: formDataBaru },
            { transaction: t },
          );
          await RiwayatSurat.create(
            {
              surat_id: rootSuratId,
              status: "Disposisi",
              catatan: `Surat diteruskan melalui disposisi ke ${identitasTargetLengkap}.`,
            },
            { transaction: t },
          );
        }
      }

      // ── Buat surat baru untuk penerima berikutnya ────────────────────────────
      const newSurat = await Surat.create(
        {
          user_id: req.user.user_id,
          penerima_id: target_penerima_id,
          parent_id: oldSurat.id,       // ← menunjuk ke surat yang mendisposisikan
          root_surat_id: rootSuratId,   // ← selalu menunjuk ke surat asal mahasiswa
          jenis_surat: oldSurat.jenis_surat,
          nomor_surat: oldSurat.nomor_surat,
          status: "Sent",
          form_data: formDataBaru,
        },
        { transaction: t },
      );

      if (newLampiransData.length > 0) {
        await DokumenLampiran.bulkCreate(
          newLampiransData.map((l) => ({ surat_id: newSurat.id, ...l })),
          { transaction: t },
        );
      }

      await RiwayatSurat.create(
        {
          surat_id: newSurat.id,
          status: "Sent",
          catatan: `Dokumen masuk melalui disposisi dari ${identitasAktorLengkap}.`,
        },
        { transaction: t },
      );

      await t.commit();
      return response(res, true, "Surat berhasil didisposisikan", { new_surat_id: newSurat.id });
    } catch (error) {
      await t.rollback();
      return response(res, false, error.message);
    }
  };
}

module.exports = SuratController;
