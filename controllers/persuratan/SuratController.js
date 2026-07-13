const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { Surat, User, DataPribadi, RiwayatSurat, DokumenLampiran, sequelize } = require("../../models/Persuratan");
const TrxUserJabatanUnit = require("../../models/TrxUserJabatanUnit");
const Jabatan = require("../../models/master/Jabatan");
const Unit = require("../../models/master/Unit");
const TrxParentMhs = require("../../models/TrxParentMhs");
const Parents = require("../../models/Parents");

const { generateSuratPengunduranDiri, generateSuratCutiAkademik } = require("../../utils/pdfGenerator");
const DB = require("../../database");

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
      let { limit, page, mode } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      const pagelimit = getPagination(limit, page);

      const condition = {
        deleted_at: null,
        parent_id: null,
      };

      if (mode === "inbox") {
        condition.penerima_id = req.user.user_id;
      } else if (mode === "outbox") {
        condition.user_id = req.user.user_id;
      } else {
        const adminRoles = ["admin", "staf", "staff", "tu", "pegawai"];
        if (!adminRoles.includes(req.user.role?.toLowerCase())) {
          condition[Op.and] = [
            {
              [Op.or]: [{ user_id: req.user.user_id }, { penerima_id: req.user.user_id }],
            },
          ];
        }
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

        const parsedFormData = safeJsonParse(form_data);

        if (jenis_surat?.toLowerCase() === "surat pengunduran diri") {
          if (!parsedFormData.ttd_mhs) {
            await t.rollback();
            return response(
              res,
              false,
              "Pengajuan gagal: Anda wajib membubuhkan Tanda Tangan Digital secara langsung (Live Drawing) pada form pengajuan."
            );
          }

          const parentRelation = await TrxParentMhs.findOne({
            where: { mhs_id: req.user.user_id },
            include: [{ 
              model: Parents, 
              as: "parent",
              attributes: ["id", "nama_lengkap"]
            }],
            transaction: t
          });

          if (!parentRelation || !parentRelation.parent) {
            await t.rollback();
            return response(
              res,
              false,
              "Pengajuan gagal: Akun Anda belum terhubung dengan akun Orang Tua/Wali di sistem. Silakan hubungi Admin atau daftarkan akun Orang Tua terlebih dahulu."
            );
          }

          parsedFormData.nama_ortu_wali = parentRelation.parent.nama_lengkap;
        }
     
        const [adminUsers, stafTuRecords] = await Promise.all([        
          User.findAll({
            where: { role: "Admin" },
            attributes: ["user_id"],
            transaction: t,
          }),
    
          TrxUserJabatanUnit.findAll({
            include: [
              {
                model: Jabatan,
                as: "jabatan",
                where: {
                  [Op.or]: [
                    { nama_jabatan: { [Op.iLike]: "%Tata Usaha%" } },
                    { nama_jabatan: { [Op.iLike]: "%Staf%" } },
                    { nama_jabatan: { [Op.iLike]: "%Pegawai%" } },
                  ],
                },
                attributes: ["nama_jabatan"],
              },
              {
                model: Unit,
                as: "unit",
                where: { nama_unit: { [Op.iLike]: "%informatika%" } },
                attributes: ["nama_unit"],
              },
            ],
            attributes: ["user_id"],
            transaction: t,
          }),
        ]);

        const adminIds = adminUsers.map((u) => String(u.user_id));
        const tuIds = stafTuRecords.map((r) => String(r.user_id));
        
        const uniquePenerimaIds = tuIds.length > 0 ? [...new Set(tuIds)] : [...new Set(adminIds)];

        if (uniquePenerimaIds.length === 0) {
          await t.rollback();
          return response(res, false, "Gagal mengirim: Tidak ada Staf Tata Usaha Informatika atau Admin yang terdaftar di sistem.");
        }

        const loadCounts = await Surat.findAll({
          attributes: ['penerima_id', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
          where: { 
            penerima_id: { [Op.in]: uniquePenerimaIds },
            status: "Sent"
          },
          group: ['penerima_id'],
          raw: true,
          transaction: t
        });

        const loadMap = {};
        uniquePenerimaIds.forEach(id => loadMap[id] = 0);
        loadCounts.forEach(row => {
          loadMap[row.penerima_id] = parseInt(row.total, 10);
        });

        let targetPenerimaId = uniquePenerimaIds[0];
        let minLoad = loadMap[targetPenerimaId];
        
        for (const id of uniquePenerimaIds) {
          if (loadMap[id] < minLoad) {
            minLoad = loadMap[id];
            targetPenerimaId = id;
          }
        }

        const savedSurat = await Surat.create(
          {
            user_id: req.user.user_id,
            penerima_id: targetPenerimaId,
            parent_id: parent_id || null,
            jenis_surat,
            nomor_surat: nomor_surat || null,
            status: "Sent",
            form_data: parsedFormData,
          },
          { transaction: t }
        );

        if (req.files && req.files.length > 0) {
          const lampiranData = req.files.map((file) => ({
            surat_id: savedSurat.id,
            nama_file: file.originalname,
            file_url: file.filename,
          }));
          await DokumenLampiran.bulkCreate(lampiranData, { transaction: t });
        }

        await RiwayatSurat.create(
          {
            surat_id: savedSurat.id,
            status: "Sent",
            catatan: `Pengajuan dokumen mahasiswa berhasil dibuat. Dilakukan oleh: ${nama_aktor || "Pengguna"}`,
          },
          { transaction: t }
        );

        await t.commit();

        const fullData = await Surat.findOne({
          where: { id: savedSurat.id },
          include: [{ model: DokumenLampiran }],
        });

        return response(res, true, `Surat berhasil dikirim ke Admin TU`, fullData ? fullData.toJSON() : null);
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
          catatan: `Pesan balasan dikirimkan. Dilakukan oleh: ${nama_aktor || "Pengguna"}`,
        },
        { transaction: t },
      );

      await t.commit();

      const fullData = await Surat.findOne({
        where: { id: save.id },
        include: [{ model: DokumenLampiran }],
      });

      return response(res, true, "Surat berhasil dikirim", fullData ? fullData.toJSON() : null);
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
      return response(res, false, error.message);
    }
  };

  static updateStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { status, catatan, form_data_updates } = req.body;

      const data = await Surat.findByPk(id, {
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: ["npm", "nidn"],
            include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap", "alamat", "no_hp"] }]
          }
        ],
        transaction: t
      });
      if (!data) {
        await t.rollback();
        return response(res, false, "Data tidak ditemukan");
      }

      let currentFormData = safeJsonParse(data.form_data);

      if (form_data_updates) {
         const updates = safeJsonParse(form_data_updates);
         
         if (updates.ttd_kaprodi) {
             currentFormData.ttd_kaprodi = updates.ttd_kaprodi;
             currentFormData.nama_kaprodi = req.user.personal_data?.nama_lengkap || req.user.username || "Ketua Program Studi";
         }
         if (updates.ttd_ortu) {
             currentFormData.ttd_ortu = updates.ttd_ortu;
             const namaUserYgLogin = req.user.nama_lengkap || req.user.personal_data?.nama_lengkap;
             currentFormData.nama_ortu_wali = namaUserYgLogin || updates.nama_ortu_wali || "-";
         }
         
         for (const key in updates) {
             if (!["ttd_mhs", "ttd_kaprodi", "ttd_ortu", "nama_kaprodi", "nama_ortu_wali"].includes(key)) {
                 currentFormData[key] = updates[key];
             }
         }
      }

      if (status === "Selesai") {
         if (data.jenis_surat?.toLowerCase() === "surat pengunduran diri") {
             if (!currentFormData.ttd_ortu) {
                 await t.rollback();
                 return response(res, false, "Gagal memproses: Tanda Tangan Orang Tua/Wali belum dibubuhkan. Mohon pastikan Orang Tua mahasiswa bersangkutan telah login dan menandatangani dokumen ini.");
             }
         } else if (data.jenis_surat?.toLowerCase() === "surat pengajuan cuti") {
             if (!currentFormData.ttd_kaprodi) {
                 await t.rollback();
                 return response(res, false, "Gagal memproses: Tanda Tangan Kaprodi belum dibubuhkan. Dokumen ini wajib ditandatangani oleh Kaprodi.");
             }
         }
      }

      await data.update(
        {
          status,
          catatan_pejabat: catatan,
          form_data: currentFormData,
        },
        { transaction: t },
      );

      await RiwayatSurat.create(
        {
          surat_id: id,
          status: status,
          catatan: catatan || `Status dokumen diperbarui menjadi ${status}`,
        },
        { transaction: t },
      );

      await t.commit();

      if (status === "Selesai") {
        const formatTanggal = new Date().toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const folderPath = path.join(__dirname, "../../public/generated-pdf");
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const cleanJenis = data.jenis_surat.replace(/^surat\s+/i, "").replace(/\s+/g, "_");
        const identitas = currentFormData.npm || data.id.substring(0, 8);
        const fileName = `Surat_${cleanJenis}_${identitas}.pdf`;
        const fileOutputPath = path.join(folderPath, fileName);

        if (data.jenis_surat?.toLowerCase() === "surat pengunduran diri") {
          const ttdMhsBase64 = currentFormData.ttd_mhs || null;
          const ttdOrtuBase64 = currentFormData.ttd_ortu || null;
          const namaOrtu = currentFormData.nama_ortu_wali || "-";

          await generateSuratPengunduranDiri(data, formatTanggal, ttdMhsBase64, ttdOrtuBase64, namaOrtu, fileOutputPath);

          currentFormData.pdf_url = `/generated-pdf/${fileName}`;
          await DB.query("UPDATE tb_surat SET form_data = $1 WHERE id = $2", [currentFormData, data.id]);

        } else if (data.jenis_surat?.toLowerCase() === "surat pengajuan cuti") {
          const ttdKaprodiBase64 = currentFormData.ttd_kaprodi || null;
          const namaKaprodi = currentFormData.nama_kaprodi || "Ketua Program Studi";

          await generateSuratCutiAkademik(data, formatTanggal, ttdKaprodiBase64, namaKaprodi, fileOutputPath);

          currentFormData.pdf_url = `/generated-pdf/${fileName}`;
          await DB.query("UPDATE tb_surat SET form_data = $1 WHERE id = $2", [currentFormData, data.id]);
        }
      }

      return response(res, true, `Status berhasil diperbarui menjadi ${status}`, {
        pdf_url: currentFormData.pdf_url || null,
      });
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
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

      if (data.penerima_id === req.user.user_id && data.status === "Sent") {
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
          if (!t.finished) {
            await t.rollback();
          }
          throw err;
        }
      }

      const replies = await Surat.findAll({
        where: { parent_id: id, deleted_at: null },
        include: [
          {
            model: User,
            as: "Pengirim",
            attributes: ["npm", "email"],
          },
          { model: DokumenLampiran },
        ],
        order: [["created_at", "ASC"]],
      });

      return response(res, true, "Success", {
        ...data.toJSON(),
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

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          isSuccess: false,
          statusCode: 400,
          responseMessage: "Format ID tidak valid. Parameter harus berupa UUID yang valid.",
          data: null,
        });
      }

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

      if (!data) {
        return res.status(404).json({
          isSuccess: false,
          statusCode: 404,
          responseMessage: "Dokumen tidak ditemukan atau telah dihapus.",
          data: null,
        });
      }

      const plain = data.toJSON();
      plain.form_data = safeJsonParse(plain.form_data);

      return response(res, true, "Data QR berhasil dimuat", plain);
    } catch (error) {
      console.error("[getQr Error]:", error.message);
      return response(res, false, error.message);
    }
  };

  static disposisi = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      let { target_penerima_id, catatan_disposisi } = req.body;

      if (target_penerima_id === "AUTO_KAPRODI") {
        const kaprodiUser = await User.findOne({
          where: { email: { [Op.iLike]: "%hersanto%" } },
          transaction: t,
        });

        if (!kaprodiUser) {
          await t.rollback();
          return response(res, false, "Otomatisasi Gagal: Akun Kaprodi Teknik Informatika tidak terdeteksi di database. Silakan gunakan tombol Disposisi Manual.");
        }
        
        target_penerima_id = kaprodiUser.user_id;
        if (!catatan_disposisi) {
          catatan_disposisi = "Mohon evaluasi dan tanda tangan persetujuan untuk dokumen ini.";
        }
      }

      const oldSurat = await Surat.findOne({
        where: { id, deleted_at: null },
        include: [{ model: DokumenLampiran }],
        transaction: t,
      });

      if (!oldSurat) {
        await t.rollback();
        return response(res, false, "Surat tidak ditemukan");
      }
      
      const adminRoles = ["admin", "staf", "staff", "tu", "pegawai"];
      const isAdmin = adminRoles.includes(req.user.role?.toLowerCase());
      if (!isAdmin && oldSurat.penerima_id !== req.user.user_id) {
        await t.rollback();
        return response(res, false, "Hanya penerima saat ini atau Admin yang dapat mendisposisikan surat.");
      }
      if (String(target_penerima_id) === String(req.user.user_id)) {
        await t.rollback();
        return response(res, false, "Ditolak: Anda tidak dapat mendisposisikan surat kepada diri Anda sendiri.");
      }

      const targetUserCheck = await User.findOne({ where: { user_id: target_penerima_id }, transaction: t });
      if (!targetUserCheck) {
        await t.rollback();
        return response(res, false, "Ditolak: Pengguna target tidak ditemukan.");
      }
      if (targetUserCheck.role?.toLowerCase() === "mahasiswa") {
        await t.rollback();
        return response(res, false, "Ditolak: Dokumen tidak dapat didisposisikan kepada Mahasiswa.");
      }

      const isCutiAkademik = oldSurat.jenis_surat?.toLowerCase() === "surat pengajuan cuti";
      const isTindakLanjut = oldSurat.jenis_surat?.toLowerCase() === "tindak lanjut dokumen";
      if (!isCutiAkademik && !isTindakLanjut && oldSurat.status !== "Selesai") {
        await t.rollback();
        return response(res, false, "Ditolak: Anda harus Selesaikan Pengajuan (klik Selesai) terlebih dahulu sebelum dapat meneruskannya (Disposisi).");
      }

      let disposisiFile = null;

      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        disposisiFile = {
          nama_file: file.originalname,
          file_url: file.filename,
        };
      }

      const currentHistory = oldSurat.form_data?.history_disposisi || [];

      const [pelakuUser, targetUser] = await Promise.all([
        User.findByPk(req.user.user_id, {
          include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          transaction: t,
        }),
        User.findByPk(target_penerima_id, {
          include: [{ model: DataPribadi, as: "personal_data", attributes: ["nama_lengkap"] }],
          transaction: t,
        }),
      ]);

      const getIdentity = (u) => {
        const npm = u?.npm;
        const nidn = u?.nidn;
        const nip = u?.personal_data?.nip;
        if (npm && String(npm).trim() !== "null" && String(npm).trim() !== "") return String(npm).trim();
        if (nidn && String(nidn).trim() !== "null" && String(nidn).trim() !== "") return String(nidn).trim();
        if (nip && String(nip).trim() !== "null" && String(nip).trim() !== "") return String(nip).trim();
        return null;
      };

      const pelakuNama = pelakuUser?.personal_data?.nama_lengkap || pelakuUser?.username || "Sistem";
      const pelakuIdentitas = getIdentity(pelakuUser);
      const pelakuRole = pelakuUser?.role ? pelakuUser.role.toUpperCase() : "USER";
      const identitasAktorLengkap = pelakuIdentitas 
        ? `${pelakuNama} (${pelakuIdentitas} - ${pelakuRole})`
        : `${pelakuNama} (${pelakuRole})`;

      const targetName = targetUser?.personal_data?.nama_lengkap || targetUser?.username || "Pengguna";
      const targetIdentitas = getIdentity(targetUser);
      const targetRole = targetUser?.role ? targetUser.role.toUpperCase() : "USER";
      const identitasTargetLengkap = targetIdentitas
        ? `${targetName} (${targetIdentitas} - ${targetRole})`
        : `${targetName} (${targetRole})`;

      currentHistory.push({
        aktor: identitasAktorLengkap,
        target_penerima: identitasTargetLengkap,
        catatan: catatan_disposisi || "Tanpa catatan disposisi",
        tanggal: new Date().toISOString(),
        lampiran: disposisiFile,
      });

      if (oldSurat.status === "Selesai") {
        const newFormData = {
          ...oldSurat.form_data,
          history_disposisi: [],
          original_surat_id: oldSurat.id,
          perihal: `Tindak Lanjut: ${oldSurat.form_data?.perihal || oldSurat.jenis_surat}`,
        };

        const newSurat = await Surat.create(
          {
            user_id: req.user.user_id,
            penerima_id: target_penerima_id,
            jenis_surat: "Tindak Lanjut Dokumen",
            nomor_surat: oldSurat.nomor_surat,
            status: "Sent",
            catatan_pejabat: catatan_disposisi || "Disposisi Lanjutan",
            form_data: newFormData,
          },
          { transaction: t }
        );

        if (disposisiFile) {
          await DokumenLampiran.create(
            {
              surat_id: newSurat.id,
              nama_file: disposisiFile.nama_file,
              file_url: disposisiFile.file_url,
            },
            { transaction: t }
          );
        }

        await RiwayatSurat.create(
          {
            surat_id: oldSurat.id,
            status: "Selesai",
            catatan: `Dokumen diteruskan ke ${identitasTargetLengkap} sebagai Tindak Lanjut Dokumen. Oleh: ${identitasAktorLengkap}`,
          },
          { transaction: t }
        );

        // Catat history di surat baru
        await RiwayatSurat.create(
          {
            surat_id: newSurat.id,
            status: "Sent",
            catatan: `Menerima dokumen tindak lanjut dari ${identitasAktorLengkap}. Catatan: ${catatan_disposisi || "-"}`,
          },
          { transaction: t }
        );

      } else {
        const formDataBaru = {
          ...oldSurat.form_data,
          history_disposisi: [...currentHistory],
        };

        await oldSurat.update(
          {
            penerima_id: target_penerima_id,
            status: "Sent",
            catatan_pejabat: catatan_disposisi || "Didisposisikan",
            form_data: formDataBaru,
          },
          { transaction: t },
        );

        if (disposisiFile) {
          await DokumenLampiran.create(
            {
              surat_id: oldSurat.id,
              nama_file: disposisiFile.nama_file,
              file_url: disposisiFile.file_url,
            },
            { transaction: t }
          );
        }

        await RiwayatSurat.create(
          {
            surat_id: oldSurat.id,
            status: "Disposisi",
            catatan: `Surat didisposisikan kepada ${identitasTargetLengkap}. Catatan: ${catatan_disposisi || "-"}. Oleh: ${identitasAktorLengkap}`,
          },
          { transaction: t },
        );
      }

      await t.commit();
      return response(res, true, "Surat berhasil didisposisikan");
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
      return response(res, false, error.message);
    }
  };
}

module.exports = SuratController;
