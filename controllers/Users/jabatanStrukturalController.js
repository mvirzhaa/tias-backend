const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const Unit = require("../../models/master/Unit");
const TrxUserJabatanUnit = require("../../models/TrxUserJabatanUnit");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");
const Jabatan = require("../../models/master/Jabatan");

class JabatanStrukturalController {
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
              "$user.personal_data.nama_lengkap$": { [Op.like]: `%${search}%` },
            },
            { "$jabatan.nama_jabatan$": { [Op.like]: `%${search}%` } },
          ],
        };
      }

      const data = await TrxUserJabatanUnit.findAndCountAll({
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
          {
            model: Jabatan,
            as: "jabatan",
          },
          {
            model: Unit,
            as: "unit",
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

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await TrxUserJabatanUnit.findOne({
        where: {
          id,
        },
        include: [
          {
            model: User,
            as: "user",
            include: {
              model: DataPribadi,
              as: "personal_data",
            },
          },
          {
            model: Jabatan,
            as: "jabatan",
          },
          {
            model: Unit,
            as: "unit",
          },
        ],
      });

      return response(res, true, "Success", data);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static create = async (req, res) => {
    try {
      const checkName = await TrxUserJabatanUnit.findOne({
        where: {
          user_id: req.body.user_id,
          jabatan_id: req.body.jabatan_id,
          unit_id: req.body.unit_id,
          keterangan: req.body.keterangan,
        },
      });

      if (checkName) {
        return response(
          res,
          false,
          "Error, user dengan unit dan jabatan sudah digunakan!",
          null
        );
      }

      const casting = CastObject({
        Model: TrxUserJabatanUnit,
        body: req.body,
      });

      const save = await TrxUserJabatanUnit.create({
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

      const check = await TrxUserJabatanUnit.findOne({
        where: {
          id,
        },
      });

      if (!check) {
        return response(res, false, "data Tidak ditemukan ", null);
      }

      const casting = CastObject({
        Model: TrxUserJabatanUnit,
        body: req.body,
      });
      delete casting.id;

      const update = await TrxUserJabatanUnit.update(casting, {
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

      await TrxUserJabatanUnit.update(
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

module.exports = JabatanStrukturalController;
