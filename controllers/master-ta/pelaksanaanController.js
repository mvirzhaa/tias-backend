const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const TaPelaksanaan = require("../../models/master-ta/TaPelaksanaan");
const TaTahapan = require("../../models/master-ta/TaTahapan");
const TaSkema = require("../../models/master-ta/TaSkema");
const TaKelengkapan = require("../../models/master-ta/TaKelengkapan");
const TaPelaksanaanKelengkapan = require("../../models/master-ta/TaPelaksanaanKelengkapan");
const TaPengajuan = require("../../models/TugasAkhir/TaPengajuan");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");

const includeRelations = [
  {
    model: TaTahapan,
    as: "tahapan",
    required: false,
    include: [{ model: TaSkema, as: "skema", required: false }],
  },
  {
    model: User,
    as: "mahasiswa",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
  { model: TaPengajuan, as: "pengajuan", required: false },
];

async function getKelengkapanWithIsian(tahapanId, pelaksanaanId) {
  const defs = await TaKelengkapan.findAll({
    where: { tahapan_id: tahapanId },
    order: [["id", "ASC"]],
  });

  const submitted = await TaPelaksanaanKelengkapan.findAll({
    where: { pelaksanaan_id: pelaksanaanId },
  });
  const submittedMap = new Map(submitted.map((item) => [item.kelengkapan_id, item.isian]));

  return defs.map((def) => ({
    id: def.id,
    nama_kelengkapan: def.nama_kelengkapan,
    isian: submittedMap.has(def.id) ? submittedMap.get(def.id) : null,
  }));
}

class PelaksanaanController {
  static index = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, status } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      const condition = {};
      condition.status = status || "berjalan";

      if (search) {
        condition[Op.or] = [
          { "$mahasiswa.personal_data.nama_lengkap$": { [Op.iLike]: `%${search}%` } },
          { "$pengajuan.npm$": { [Op.iLike]: `%${search}%` } },
        ];
      }

      const data = await TaPelaksanaan.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: includeRelations,
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: data.rows,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await TaPelaksanaan.findOne({
        where: { id },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const kelengkapan = await getKelengkapanWithIsian(data.tahapan_id, data.id);

      return response(res, true, "success", { ...data.toJSON(), kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Dosen cuma boleh lihat mahasiswa yang dia bimbing (pembimbing_1/2 atau kepala
  // lab di pengajuan TA terkait) - read-only, tidak bisa advance (itu wewenang admin).
  static indexForDosen = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      let { limit, page, order, orderBy, search, status } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      const condition = {
        status: status || "berjalan",
        [Op.or]: [
          { "$pengajuan.pembimbing_1$": dosenId },
          { "$pengajuan.pembimbing_2$": dosenId },
          { "$pengajuan.kepala_lab$": dosenId },
        ],
      };

      if (search) {
        condition[Op.and] = [
          {
            [Op.or]: [
              { "$mahasiswa.personal_data.nama_lengkap$": { [Op.iLike]: `%${search}%` } },
              { "$pengajuan.npm$": { [Op.iLike]: `%${search}%` } },
            ],
          },
        ];
      }

      const data = await TaPelaksanaan.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: includeRelations,
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: data.rows,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detailForDosen = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      const { id } = req.params;

      const data = await TaPelaksanaan.findOne({
        where: {
          id,
          [Op.or]: [
            { "$pengajuan.pembimbing_1$": dosenId },
            { "$pengajuan.pembimbing_2$": dosenId },
            { "$pengajuan.kepala_lab$": dosenId },
          ],
        },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const kelengkapan = await getKelengkapanWithIsian(data.tahapan_id, data.id);

      return response(res, true, "success", { ...data.toJSON(), kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static advance = async (req, res) => {
    try {
      const { id } = req.params;
      const pelaksanaan = await TaPelaksanaan.findOne({ where: { id } });

      if (!pelaksanaan) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      if (pelaksanaan.status !== "berjalan") {
        return response(res, false, "Pelaksanaan ini sudah selesai", null, 400);
      }

      const currentTahapan = await TaTahapan.findOne({ where: { id: pelaksanaan.tahapan_id } });
      if (!currentTahapan) {
        return response(res, false, "Tahapan saat ini tidak ditemukan", null, 404);
      }

      const nextTahapan = await TaTahapan.findOne({
        where: {
          prodi_id: currentTahapan.prodi_id,
          skema_id: currentTahapan.skema_id,
          id: { [Op.gt]: currentTahapan.id },
        },
        order: [["id", "ASC"]],
      });

      if (nextTahapan) {
        await TaPelaksanaan.update(
          { tahapan_id: nextTahapan.id, updated_at: new Date() },
          { where: { id } }
        );
        return response(res, true, `Lanjut ke tahapan: ${nextTahapan.nama_tahapan}`, {
          tahapan_id: nextTahapan.id,
          status: "berjalan",
        });
      }

      await TaPelaksanaan.update(
        { status: "selesai", updated_at: new Date() },
        { where: { id } }
      );
      return response(res, true, "Tahapan terakhir selesai, pelaksanaan TA ditandai selesai", {
        status: "selesai",
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static myCurrent = async (req, res) => {
    try {
      const data = await TaPelaksanaan.findOne({
        where: { mhs_id: req.user.user_id, status: "berjalan" },
        order: [["id", "DESC"]],
        include: includeRelations,
      });

      if (!data) {
        return response(res, true, "success", null);
      }

      const kelengkapan = await getKelengkapanWithIsian(data.tahapan_id, data.id);

      return response(res, true, "success", { ...data.toJSON(), kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static submitKelengkapan = async (req, res) => {
    try {
      const items = Array.isArray(req.body.items) ? req.body.items : [];

      const pelaksanaan = await TaPelaksanaan.findOne({
        where: { mhs_id: req.user.user_id, status: "berjalan" },
        order: [["id", "DESC"]],
      });

      if (!pelaksanaan) {
        return response(res, false, "Tidak ada pelaksanaan TA yang sedang berjalan", null, 404);
      }

      const now = new Date();
      for (const item of items) {
        const def = await TaKelengkapan.findOne({
          where: { id: item.kelengkapan_id, tahapan_id: pelaksanaan.tahapan_id },
        });
        if (!def) continue;

        const existing = await TaPelaksanaanKelengkapan.findOne({
          where: { pelaksanaan_id: pelaksanaan.id, kelengkapan_id: item.kelengkapan_id },
        });

        if (existing) {
          await TaPelaksanaanKelengkapan.update(
            { isian: item.isian || null, updated_at: now },
            { where: { id: existing.id } }
          );
        } else {
          await TaPelaksanaanKelengkapan.create({
            pelaksanaan_id: pelaksanaan.id,
            kelengkapan_id: item.kelengkapan_id,
            isian: item.isian || null,
            created_at: now,
            updated_at: now,
          });
        }
      }

      const kelengkapan = await getKelengkapanWithIsian(pelaksanaan.tahapan_id, pelaksanaan.id);
      return response(res, true, "Kelengkapan berhasil disimpan", { kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = PelaksanaanController;
