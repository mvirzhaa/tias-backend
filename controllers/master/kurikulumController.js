const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const Kurikulum = require("../../models/master/Kurikulum");

class KurikulumController {
  static index = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, filter, filterValue } =
        req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      let whereCondition = {};

      if (filter && filterValue) {
        const filters = Array.isArray(filter) ? filter : [filter];
        const filterValues = Array.isArray(filterValue)
          ? filterValue
          : [filterValue];

        filters.forEach((f, index) => {
          if (f && filterValues[index] !== undefined) {
            whereCondition[f] = filterValues[index];
          }
        });
      }

      let condition = {
        [Op.and]: whereCondition,
      };

      if (search) {
        condition = {
          ...condition,
          [Op.or]: {
            kurikulum: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await Kurikulum.findAndCountAll({
        distinct: true,
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
      return response(res, false, error.message, error);
    }
  };

  static all = async (req, res) => {
    try {
      const data = await Kurikulum.findAll();

      res.status(200).json({
        message: "Success get data.",
        data: data,
      });
    } catch (error) {
      return response(res, true, "error", error.message);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await Kurikulum.findOne({
        where: {
          id,
        },
      });

      return response(res, true, "Success", data);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static create = async (req, res) => {
    try {
      const checkName = await Kurikulum.findOne({
        where: {
          kurikulum: req.body.kurikulum,
        },
      });

      if (checkName) {
        return response(res, false, "Error, kurikulum sudah digunakan!", null);
      }

      const casting = CastObject({
        Model: Kurikulum,
        body: req.body,
      });

      const save = await Kurikulum.create({
        ...casting,
      });
      return response(res, true, "success", save);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static update = async (req, res) => {
    try {
      const { id } = req.params;

      const check = await Kurikulum.findOne({
        where: {
          id,
        },
      });

      if (!check) {
        return response(res, false, "Kurikulum Tidak ditemukan ", null);
      }

      const casting = CastObject({
        Model: Kurikulum,
        body: req.body,
      });
      delete casting.id;

      const update = await Kurikulum.update(casting, {
        where: {
          id,
        },
      });

      return response(res, true, "success", update);
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static destroy = async (req, res) => {
    try {
      const { id } = req.params;

      await Kurikulum.update(
        {
          deleted_at: Date.now(),
        },
        {
          where: { id },
        }
      );

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };
}

module.exports = KurikulumController;
