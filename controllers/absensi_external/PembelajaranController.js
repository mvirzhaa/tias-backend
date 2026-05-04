const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const Matakuliah = require("../../models/master/Matakuliah");
const Pembelajaran = require("../../models/absensi-dosen/Pembelajaran");
const QRCode = require("qrcode-svg");

class PembelajaranController {
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
              "$matakuliah.nama_matakuliah$": {
                [Op.like]: `%${search}%`,
              },
            },
            {
              "$matakuliah.kode_matakuliah$": {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      const data = await Pembelajaran.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: [
          {
            model: Matakuliah,
            as: "matakuliah",
            required: false,
          },
        ],
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
      const data = await Matakuliah.findAll();

      res.status(200).json({
        message: "Success get data.",
        data: data,
      });
    } catch (error) {
      return response(res, true, "error", error.message);
    }
  };

  static checkPertemuan = async (req, res) => {
    try {
      const { id_dosen, id_matkul } = req.query;
      const findPertemuan = await Pembelajaran.findOne({
        where: {
          id_dosen: id_dosen,
          id_matkul: id_matkul,
        },
      });

      if (!findPertemuan) {
        return response(res, true, "success", 1);
      }

      const pertemuan = findPertemuan.pertemuan + 1;

      response(res, true, "success", pertemuan);
    } catch (error) {
      response(res, false, error.message, null);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await Matakuliah.findOne({
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
      const kode = Math.floor(100000 + Math.random() * 900000);

      const casting = CastObject({
        Model: Pembelajaran,
        body: req.body,
      });

      const save = await Pembelajaran.create({
        ...casting,
        token: kode,
        status_kelas: parseInt(req.body.status_kelas),
        pertemuan: parseInt(req.body.pertemuan),
        kelas: null,
      });
      return response(res, true, "success", save);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static showQr = async (req, res) => {
    try {
      const { token } = req.query;

      const findData = await Pembelajaran.findOne({
        where: {
          token: token,
        },
      });

      if (!findData) {
        return res.status(404).json({
          isSuccess: false,
          statusCode: 404,
          responseMessage: "Data not found",
          data: null,
        });
      }

      const qrToken = String(findData.token);

      const qr = new QRCode({
        content: qrToken,
        container: "svg-viewbox",
        join: true,
      });

      const svg = qr.svg();

      res.setHeader("Content-Type", "image/svg+xml");
      res.status(200).send(svg);
    } catch (error) {
      return res.status(400).json({
        isSuccess: false,
        statusCode: 400,
        responseMessage: error.message,
        data: null,
      });
    }
  };

  static update = async (req, res) => {
    try {
      const { id } = req.params;

      const check = await Pembelajaran.findOne({
        where: {
          id,
        },
      });

      if (!check) {
        return response(res, false, "Matakuliah Tidak ditemukan ", null);
      }

      const casting = CastObject({
        Model: Pembelajaran,
        body: req.body,
      });
      delete casting.id;

      const update = await Pembelajaran.update(casting, {
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

      await Pembelajaran.update(
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

  static nonActive = async (req, res) => {
    try {
      const { id } = req.params;

      await Pembelajaran.update(
        {
          learning_done: new Date(),
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

module.exports = PembelajaranController;
