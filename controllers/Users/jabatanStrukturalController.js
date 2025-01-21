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

  static getDosenJabatan = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, isFakultas, unit } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "ASC";
      const pagelimit = getPagination(limit, page);

      let whereCondition = {
        "$user.role$": {
          [Op.in]: ["Dosen"],
        },
      };

      if (isFakultas && unit) {
        whereCondition["$unit.code$"] = {
          [Op.like]: `${unit}%`,
        };
      } else if (unit) {
        whereCondition["$unit.code$"] = unit;
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
                [Op.iLike]: `%${search}%`,
              },
            },
            { "$jabatan.nama_jabatan$": { [Op.iLike]: `%${search}%` } },
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
            required: true,
            attributes: ["department_code", "nidn", "email", "role"],
            include: {
              model: DataPribadi,
              as: "personal_data",
              attributes: ["nama_lengkap", "nip", "image"],
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

      const sanitizedRows = data.rows.map((row) => {
        const json = row.toJSON();
        return {
          ...json,
          user: {
            ...json.user,
            personal_data: {
              ...json.user.personal_data,
              image: json.user.personal_data.image
                ? `${process.env.API_URL}/foto-profile/${json.user.personal_data.image}`
                : `${process.env.API_URL}/foto-profile/user.png`,
            },
          },
        };
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: sanitizedRows,
      });
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static getAllDosenJabatan = async (req, res) => {
    try {
      const { isFakultas, unit } = req.query;

      const condition = {
        "$user.role$": {
          [Op.in]: ["Dosen"],
        },
      };
      if (isFakultas && unit) {
        condition["$unit.code$"] = {
          [Op.like]: `${unit}%`,
        };
      } else if (unit) {
        condition["$unit.code$"] = unit;
      }

      const data = await TrxUserJabatanUnit.findAll({
        where: condition,
        order: [["id", "ASC"]],
        include: [
          {
            model: User,
            as: "user",
            required: true,
            attributes: ["department_code", "nidn", "email"],
            include: {
              model: DataPribadi,
              as: "personal_data",
              attributes: ["nama_lengkap", "nip", "image"],
            },
          },
          {
            model: Jabatan,
            as: "jabatan",
            required: true,
          },
          {
            model: Unit,
            required: true,
            as: "unit",
          },
        ],
      });

      const sanitizedRows = data.map((iterate) => {
        const json = iterate.toJSON();
        return {
          ...json,
          image: `${process.env.API_URL}/foto-profile/${json.user.personal_data.image}`,
        };
      });

      return response(res, true, "success", sanitizedRows);
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static getPegawaiJabatan = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, isFakultas, unit } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "ASC";
      const pagelimit = getPagination(limit, page);

      let whereCondition = {
        "$user.role$": {
          [Op.in]: ["Pegawai"],
        },
      };

      if (isFakultas && unit) {
        whereCondition["$unit.code$"] = {
          [Op.like]: `${unit}%`,
        };
      } else if (unit) {
        whereCondition["$unit.code$"] = unit;
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
                [Op.iLike]: `%${search}%`,
              },
            },
            { "$jabatan.nama_jabatan$": { [Op.iLike]: `%${search}%` } },
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
            required: true,
            attributes: ["department_code", "nidn", "email", "role"],
            include: {
              model: DataPribadi,
              as: "personal_data",
              attributes: ["nama_lengkap", "nip", "image"],
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

      const sanitizedRows = data.rows.map((row) => {
        const json = row.toJSON();
        return {
          ...json,
          user: {
            ...json.user,
            personal_data: {
              ...json.user.personal_data,
              image: json.user.personal_data.image
                ? `${process.env.API_URL}/foto-profile/${json.user.personal_data.image}`
                : `${process.env.API_URL}/foto-profile/user.png`,
            },
          },
        };
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: sanitizedRows,
      });
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static getAllPegawaiJabatan = async (req, res) => {
    try {
      const { isFakultas, unit } = req.query;

      const condition = {
        "$user.role$": {
          [Op.in]: ["Pegawai"],
        },
      };
      if (isFakultas && unit) {
        condition["$unit.code$"] = {
          [Op.like]: `${unit}%`,
        };
      } else if (unit) {
        condition["$unit.code$"] = unit;
      }

      const data = await TrxUserJabatanUnit.findAll({
        where: condition,
        order: [["id", "ASC"]],
        include: [
          {
            model: User,
            as: "user",
            required: true,
            attributes: ["department_code", "nidn", "email"],
            include: {
              model: DataPribadi,
              as: "personal_data",
              attributes: ["nama_lengkap", "nip", "image"],
            },
          },
          {
            model: Jabatan,
            as: "jabatan",
            required: true,
          },
          {
            model: Unit,
            required: true,
            as: "unit",
          },
        ],
      });

      const sanitizedRows = data.map((iterate) => {
        const json = iterate.toJSON();
        return {
          ...json,
          image: `${process.env.API_URL}/foto-profile/${json.user.personal_data.image}`,
        };
      });

      return response(res, true, "success", sanitizedRows);
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static getByUserLogin = async (req, res) => {
    try {
      const userLoginId = req.user.user_id;

      const data = await TrxUserJabatanUnit.findAll({
        where: {
          user_id: userLoginId,
        },
        include: [
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

      response(res, true, "success", data);
    } catch (error) {
      response(res, false, "error", error.message);
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
