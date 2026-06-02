const { Op } = require("sequelize");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { Surat, User, DataPribadi, RiwayatSurat, DokumenLampiran, sequelize } = require("../../models/persuratan");

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
        condition[Op.and] = [
          {
            [Op.or]: [{ user_id: req.user.user_id }, { penerima_id: req.user.user_id }],
          },
        ];
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
      const { penerima_id, jenis_surat, form_data, parent_id, nomor_surat, nama_aktor } = req.body;
      const userRole = req.user.role?.toLowerCase();

      const isReply = !!parent_id;
      const allowedMhs = ["surat pengunduran diri", "surat pengajuan cuti"];

      if (userRole === "mahasiswa" && !isReply && !allowedMhs.includes(jenis_surat?.toLowerCase())) {
        await t.rollback();
        return response(res, false, "Akses ditolak untuk jenis surat ini.");
      }

      const finalData = {
        user_id: req.user.user_id,
        penerima_id,
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
          catatan: isReply ? `Pesan balasan dikirimkan. Dilakukan oleh: ${nama_aktor || "Pengguna"}` : `Pengajuan dokumen berhasil dibuat. Dilakukan oleh: ${nama_aktor || "Pengguna"}`,
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

      const data = await Surat.findByPk(id, { transaction: t });
      if (!data) {
        await t.rollback();
        return response(res, false, "Data tidak ditemukan");
      }

      await data.update({ status, catatan_pejabat: catatan }, { transaction: t });

      await RiwayatSurat.create(
        {
          surat_id: id,
          status: status,
          catatan: catatan || `Status dokumen diperbarui menjadi ${status}`,
        },
        { transaction: t },
      );

      await t.commit();
      return response(res, true, `Status berhasil diperbarui menjadi ${status}`);
    } catch (error) {
      await t.rollback();
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
          await t.rollback();
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

  static disposisi = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { target_penerima_id, catatan_disposisi } = req.body;

      const oldSurat = await Surat.findOne({
        where: { id, deleted_at: null },
        include: [{ model: DokumenLampiran }],
        transaction: t, // ✅ Konsistensi transaksi
      });

      if (!oldSurat) {
        await t.rollback();
        return response(res, false, "Surat tidak ditemukan");
      }
      if (oldSurat.penerima_id !== req.user.user_id) {
        await t.rollback();
        return response(res, false, "Hanya penerima saat ini yang dapat mendisposisikan surat.");
      }
      if (String(target_penerima_id) === String(req.user.user_id)) {
        await t.rollback();
        return response(res, false, "Ditolak: Anda tidak dapat mendisposisikan surat kepada diri Anda sendiri.");
      }

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
        disposisiFile = {
          nama_file: file.originalname,
          file_url: file.filename,
        };
        newLampiransData.push(disposisiFile);
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

      const pelakuNama = pelakuUser?.personal_data?.nama_lengkap || pelakuUser?.username || "Sistem";
      const pelakuIdentitas = pelakuUser?.npm || req.user.user_id;
      const pelakuRole = pelakuUser?.role ? pelakuUser.role.toUpperCase() : "USER";
      const identitasAktorLengkap = `${pelakuNama} (${pelakuIdentitas} - ${pelakuRole})`;

      const targetName = targetUser?.personal_data?.nama_lengkap || targetUser?.username || "Pengguna";
      const targetIdentitas = targetUser?.npm || target_penerima_id;
      const targetRole = targetUser?.role ? targetUser.role.toUpperCase() : "USER";
      const identitasTargetLengkap = `${targetName} (${targetIdentitas} - ${targetRole})`;

      currentHistory.push({
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

      await oldSurat.update(
        {
          status: "Selesai",
          catatan_pejabat: `Surat didisposisikan ke pihak lain.`,
          form_data: formDataBaru,
        },
        { transaction: t },
      );

      await RiwayatSurat.create(
        {
          surat_id: oldSurat.id,
          status: "Selesai",
          catatan: `Surat didisposisikan ke pihak berikutnya. Catatan: ${catatan_disposisi || "-"}. Dilakukan oleh: ${identitasAktorLengkap}`,
        },
        { transaction: t },
      );

      const newSurat = await Surat.create(
        {
          user_id: req.user.user_id,
          penerima_id: target_penerima_id,
          parent_id: null,
          jenis_surat: oldSurat.jenis_surat,
          nomor_surat: oldSurat.nomor_surat,
          status: "Sent",
          form_data: formDataBaru,
        },
        { transaction: t },
      );

      if (newLampiransData.length > 0) {
        const lampiranInsert = newLampiransData.map((l) => ({
          surat_id: newSurat.id,
          ...l,
        }));
        await DokumenLampiran.bulkCreate(lampiranInsert, { transaction: t });
      }

      await RiwayatSurat.create(
        {
          surat_id: newSurat.id,
          status: "Sent",
          catatan: "Dokumen masuk melalui proses disposisi dari pihak sebelumnya.",
        },
        { transaction: t },
      );

      await t.commit();
      return response(res, true, "Surat berhasil didisposisikan");
    } catch (error) {
      await t.rollback();
      return response(res, false, error.message);
    }
  };
}

module.exports = SuratController;
