const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const KategoriLaporan = require("../../models/master/KategoriLaporan");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");

class KategoriLaporanController {
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
        // Assuming you want to search multiple fields or ensure case-insensitivity
        condition = {
          ...condition,
          [Op.or]: [
            { nama_kategori: { [Op.iLike]: `%${search}%` } }, // Case-insensitive search
            // Add more fields if needed
          ],
        };
      }

      const data = await KategoriLaporan.findAndCountAll({
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

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await KategoriLaporan.findOne({
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
      const checkName = await KategoriLaporan.findOne({
        where: {
          nama_kategori: req.body.nama_kategori,
        },
      });

      if (checkName) {
        return response(
          res,
          false,
          "Error, nama kategori sudah digunakan!",
          null
        );
      }

      const casting = CastObject({
        Model: KategoriLaporan,
        body: req.body,
      });

      const save = await KategoriLaporan.create({
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

      const check = await KategoriLaporan.findOne({
        where: {
          id,
        },
      });

      if (!check) {
        return response(res, false, "Kategori Laporan Tidak ditemukan ", null);
      }

      const casting = CastObject({
        Model: KategoriLaporan,
        body: req.body,
      });
      delete casting.id;

      const update = await KategoriLaporan.update(casting, {
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

      await KategoriLaporan.destroy({
        where: { id },
      });

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };
}

module.exports = KategoriLaporanController;
