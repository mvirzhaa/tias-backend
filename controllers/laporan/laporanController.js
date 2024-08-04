const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const KategoriLaporan = require("../../models/master/KategoriLaporan");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const Laporan = require("../../models/Laporan");
const path = require("path");
const fs = require("fs-extra");

class LaporanController {
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
            nama: {
              [Op.like]: `%${search}%`,
            },
            deskripsi: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await Laporan.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: [
          {
            model: KategoriLaporan,
            as: "kategori_laporan",
            required: false,
          },
        ],
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: data.rows.map((iterate) => ({
          ...iterate.toJSON(),
          foto: `${process.env.API_URL}/dokumentasi-laporan/${iterate.foto}`,
        })),
      });
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await Laporan.findOne({
        where: {
          id,
        },
        include: [
          {
            model: KategoriLaporan,
            as: "kategori_laporan",
            required: false,
          },
        ],
      });

      return response(res, true, "Success", {
        ...data.toJSON(),
        foto: `${process.env.API_URL}/dokumentasi-laporan/${data.foto}`,
      });
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static create = async (req, res) => {
    try {
      const userLoginId = req.user.user_id;

      if (!req.file) {
        return response(res, true, "error", "please fill one file!");
      }

      const casting = CastObject({
        Model: Laporan,
        body: req.body,
      });

      const save = await Laporan.create({
        ...casting,
        foto: req.file.filename,
        user_id: userLoginId,
      });

      return response(res, true, "success", save);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static update = async (req, res) => {
    try {
      const id = req.params.id;
      const userLoginId = req.user.user_id;
      let filename;

      const laporan = await Laporan.findOne({ where: { id } });

      if (!laporan) {
        return response(res, false, "error", "Data not found!");
      }

      if (req.file) {
        await fs.remove(
          path.join(`public/dokumentasi-laporan/${laporan.foto}`)
        );
        filename = req.file.filename;
      } else {
        filename = laporan.foto;
      }
      const casting = CastObject({
        Model: Laporan,
        body: req.body,
      });

      delete casting.id;

      await Laporan.update(
        {
          ...casting,
          user_id: userLoginId,
          foto: filename,
        },
        { where: { id } }
      );

      const laporanUpdated = await Laporan.findOne({
        where: { id },
      });

      return response(res, true, "success", laporanUpdated);
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static destroy = async (req, res) => {
    try {
      const { id } = req.params;

      const laporan = await Laporan.findOne({ where: { id } });

      if (!laporan) {
        return response(res, false, "error", "Data not found!");
      }
      await fs.remove(path.join(`public/dokumentasi-laporan/${laporan.foto}`));

      await Laporan.destroy({
        where: { id },
      });

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };
}

module.exports = LaporanController;
