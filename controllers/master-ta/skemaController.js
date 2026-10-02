const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const { getPagination } = require("../../lib/pagination-parser");
const TaSkema = require("../../models/master-ta/TaSkema");

class SkemaController {
  static index = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      const condition = search
        ? { nama_skema: { [Op.iLike]: `%${search}%` } }
        : {};

      const data = await TaSkema.findAndCountAll({
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
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

  static listAll = async (req, res) => {
    try {
      const data = await TaSkema.findAll({
        where: { is_active: true },
        order: [["nama_skema", "ASC"]],
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await TaSkema.findOne({ where: { id } });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static create = async (req, res) => {
    try {
      if (!req.body.nama_skema) {
        return response(res, false, "Nama skema wajib diisi", null, 400);
      }

      const casting = CastObject({ Model: TaSkema, body: req.body });
      const save = await TaSkema.create({
        ...casting,
        created_at: new Date(),
      });

      return response(res, true, "success", save);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static update = async (req, res) => {
    try {
      const { id } = req.params;
      const check = await TaSkema.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const casting = CastObject({ Model: TaSkema, body: req.body });
      delete casting.id;

      const update = await TaSkema.update(
        { ...casting, updated_at: new Date() },
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

      await TaSkema.update({ deleted_at: new Date() }, { where: { id } });

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = SkemaController;
