const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const Ruangan = require("../../models/master/Ruangan");
const path = require("path");
const fs = require("fs-extra");

class RuanganController {
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
            nama_ruangan: {
              [Op.like]: `%${search}%`,
            },
            alamat: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await Ruangan.findAndCountAll({
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
        rows: data.rows.map((iterate) => ({
          ...iterate.toJSON(),
          foto: `${process.env.API_URL}/foto-ruangan/${iterate.foto}`,
        })),
      });
    } catch (error) {
      return response(res, false, "error", error.message);
    }
  };

  static all = async (req, res) => {
    try {
      const data = await Ruangan.findAll();

      res.status(200).json({
        message: "Success get data.",
        data: data,
      });
    } catch (error) {
      return response(res, false, "error", error.message);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await Ruangan.findOne({
        where: {
          id,
        },
      });

      return response(res, true, "Success", {
        ...data.toJSON(),
        foto: `${process.env.API_URL}/foto-ruangan/${data.foto}`,
      });
    } catch (error) {
      return response(res, true, "error", error.message);
    }
  };

  static create = async (req, res) => {
    try {
      if (!req.file) {
        return response(res, true, "error", "please fill one file!");
      }

      const casting = CastObject({
        Model: Ruangan,
        body: req.body,
      });

      const save = await Ruangan.create({
        ...casting,
        foto: req.file.filename,
      });

      return response(res, true, "success", save);
    } catch (error) {
      return response(res, true, "error", error.message);
    }
  };

  static update = async (req, res) => {
    try {
      const id = req.params.id;
      let filename;

      const ruangan = await Ruangan.findOne({ where: { id } });

      if (!ruangan) {
        return response(res, false, "error", "Data not found!");
      }

      if (req.file) {
        await fs.remove(path.join(`public/foto-ruangan/${ruangan.foto}`));
        filename = req.file.filename;
      } else {
        filename = ruangan.foto;
      }

      const casting = CastObject({
        Model: Ruangan,
        body: req.body,
      });

      delete casting.id;

      await Ruangan.update(
        {
          ...casting,
          foto: filename,
        },
        { where: { id } }
      );

      const ruanganUpdated = await Ruangan.findOne({
        where: { id },
      });

      return response(res, true, "success", ruanganUpdated);
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static destroy = async (req, res) => {
    try {
      const { id } = req.params;

      const ruangan = await Ruangan.findOne({ where: { id } });

      if (!ruangan) {
        return response(res, false, "error", "Data not found!");
      }

      await Ruangan.update(
        {
          deleted_at: new Date(),
        },
        {
          where: {
            id,
          },
        }
      );

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };
}

module.exports = RuanganController;
