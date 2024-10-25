const { Op, Sequelize } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const AbsensiMhs = require("../../models/absensi-dosen/AbsensiMhs");
const DataPribadi = require("../../models/DataPribadi");
const User = require("../../models/User");
const Pembelajaran = require("../../models/absensi-dosen/Pembelajaran");
const Matakuliah = require("../../models/master/Matakuliah");

class AbsensiController {
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
          [Op.or]: [
            {
              "$user.personal_data.nama_lengkap$": {
                [Op.like]: `%${search}%`,
              },
            },
            {
              "$user.npm$": {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      let dataPembelajaran;

      if (filterValue) {
        dataPembelajaran = await Pembelajaran.findOne({
          where: {
            id: parseInt(filterValue),
          },
          include: {
            model: Matakuliah,
            as: "matakuliah",
          },
        });
      }

      const data = await AbsensiMhs.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: [
          {
            model: User,
            as: "user",
            include: {
              model: DataPribadi,
              as: "personal_data",
            },
          },
        ],
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        pembelajaran: dataPembelajaran,
        rows: data.rows,
      });
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static all = async (req, res) => {
    try {
      const data = await AbsensiMhs.findAll();

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

      const data = await AbsensiMhs.findOne({
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
      const chechkPembelajaran = await Pembelajaran.findOne({
        where: {
          id: req.body.id_pembelajaran,
        },
      });

      if (chechkPembelajaran.learning_done != null) {
        return response(res, false, "pembelajaran sudah berakhir", null);
      }

      const findExists = await AbsensiMhs.findOne({
        where: {
          id_pembelajaran: req.body.id_pembelajaran,
          id_mhs: req.body.id_mhs,
        },
      });

      if (findExists) {
        return response(res, false, "mahasiswa sudah absen", null);
      }

      const casting = CastObject({
        Model: AbsensiMhs,
        body: req.body,
      });

      const save = await AbsensiMhs.create({
        ...casting,
        id_pembelajaran: parseInt(req.body.id_pembelajaran),
        status_absen: parseInt(req.body.status_absen),
      });
      return response(res, true, "success", save);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static update = async (req, res) => {
    try {
      const { id } = req.params;

      const check = await AbsensiMhs.findOne({
        where: {
          id,
        },
      });

      if (!check) {
        return response(res, false, "Absensi Tidak ditemukan ", null);
      }

      const casting = CastObject({
        Model: AbsensiMhs,
        body: req.body,
      });
      delete casting.id;

      const update = await AbsensiMhs.update(casting, {
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

      await AbsensiMhs.update(
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

  static scanQr = async (req, res) => {
    try {
      const chechkPembelajaran = await Pembelajaran.findOne({
        where: {
          token: req.body.token,
        },
      });

      if (chechkPembelajaran.learning_done != null) {
        return response(res, false, "pembelajaran sudah berakhir", null);
      }

      const findExists = await AbsensiMhs.findOne({
        where: {
          id_pembelajaran: chechkPembelajaran.id,
          id_mhs: req.body.id_mhs,
        },
      });

      if (findExists) {
        return response(res, false, "mahasiswa sudah absen", null);
      }

      const casting = CastObject({
        Model: AbsensiMhs,
        body: req.body,
      });

      const save = await AbsensiMhs.create({
        ...casting,
        id_pembelajaran: parseInt(chechkPembelajaran.id),
        status_absen: parseInt(req.body.status_absen),
      });
      return response(res, true, "success", save);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };
}

module.exports = AbsensiController;
