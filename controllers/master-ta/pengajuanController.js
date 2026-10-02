const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const TaPengajuan = require("../../models/TugasAkhir/TaPengajuan");
const TaSkema = require("../../models/master-ta/TaSkema");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");

const STATUS_OPTIONS = ["diajukan", "disetujui", "ditolak"];

// required:false di semua level (termasuk nested personal_data) WAJIB — tanpa ini
// Sequelize generate INNER JOIN, jadi baris ta_pengajuan hilang total dari hasil query
// setiap kali pembimbing_2 NULL (field opsional) atau dosen/skema terkait tidak match.
const includeRelations = [
  { model: TaSkema, as: "skema", required: false },
  {
    model: User,
    as: "dosen_pembimbing_1",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
  {
    model: User,
    as: "dosen_pembimbing_2",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
  {
    model: User,
    as: "dosen_kepala_lab",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
];

class PengajuanController {
  static create = async (req, res) => {
    try {
      const mhsId = req.user.user_id;
      const { npm, nama_lengkap } = req.user;
      const {
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2,
        pembimbing_luar,
        kepala_lab,
      } = req.body;

      if (!skema_id || !judul || !pembimbing_1 || !kepala_lab) {
        return response(
          res,
          false,
          "Skema, judul, pembimbing 1, dan kepala lab wajib diisi",
          null,
          400
        );
      }

      const save = await TaPengajuan.create({
        mhs_id: mhsId,
        nama: nama_lengkap,
        npm,
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2: pembimbing_2 || null,
        pembimbing_luar: pembimbing_luar || null,
        kepala_lab,
        status: "diajukan",
        created_at: new Date(),
      });

      return response(res, true, "success", save);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static myList = async (req, res) => {
    try {
      const data = await TaPengajuan.findAll({
        where: { mhs_id: req.user.user_id },
        order: [["id", "DESC"]],
        include: includeRelations,
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static index = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, status } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      const condition = {};
      if (status) condition.status = status;
      if (search) {
        condition[Op.or] = [
          { nama: { [Op.iLike]: `%${search}%` } },
          { npm: { [Op.iLike]: `%${search}%` } },
          { judul: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const data = await TaPengajuan.findAndCountAll({
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
      const data = await TaPengajuan.findOne({
        where: { id },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static update = async (req, res) => {
    try {
      const { id } = req.params;
      const check = await TaPengajuan.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const {
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2,
        pembimbing_luar,
        kepala_lab,
      } = req.body;

      if (!skema_id || !judul || !pembimbing_1 || !kepala_lab) {
        return response(
          res,
          false,
          "Skema, judul, pembimbing 1, dan kepala lab wajib diisi",
          null,
          400
        );
      }

      const update = await TaPengajuan.update(
        {
          skema_id,
          judul,
          pembimbing_1,
          pembimbing_2: pembimbing_2 || null,
          pembimbing_luar: pembimbing_luar || null,
          kepala_lab,
          updated_at: new Date(),
        },
        { where: { id } }
      );

      return response(res, true, "success", update);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static updateMine = async (req, res) => {
    try {
      const { id } = req.params;
      const check = await TaPengajuan.findOne({
        where: { id, mhs_id: req.user.user_id },
      });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      if (check.status !== "diajukan") {
        return response(
          res,
          false,
          "Pengajuan yang sudah diproses admin tidak bisa diubah lagi",
          null,
          400
        );
      }

      const {
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2,
        pembimbing_luar,
        kepala_lab,
      } = req.body;

      if (!skema_id || !judul || !pembimbing_1 || !kepala_lab) {
        return response(
          res,
          false,
          "Skema, judul, pembimbing 1, dan kepala lab wajib diisi",
          null,
          400
        );
      }

      const update = await TaPengajuan.update(
        {
          skema_id,
          judul,
          pembimbing_1,
          pembimbing_2: pembimbing_2 || null,
          pembimbing_luar: pembimbing_luar || null,
          kepala_lab,
          updated_at: new Date(),
        },
        { where: { id } }
      );

      return response(res, true, "success", update);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static updateStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!STATUS_OPTIONS.includes(status)) {
        return response(
          res,
          false,
          `Status harus salah satu dari: ${STATUS_OPTIONS.join(", ")}`,
          null,
          400
        );
      }

      const check = await TaPengajuan.findOne({ where: { id } });
      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const update = await TaPengajuan.update(
        { status, updated_at: new Date() },
        { where: { id } }
      );

      return response(res, true, "success", update);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static destroy = async (req, res) => {
    try {
      const { id } = req.params;

      await TaPengajuan.update(
        { deleted_at: new Date() },
        { where: { id } }
      );

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = PengajuanController;
