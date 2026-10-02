const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const TaKomponenPenilaian = require("../../models/master-ta/TaKomponenPenilaian");
const TaTahapan = require("../../models/master-ta/TaTahapan");

async function getTotalBobot(tahapan_id, excludeId = null) {
  const condition = { tahapan_id };
  if (excludeId) {
    condition.id = { [Op.ne]: excludeId };
  }

  const existing = await TaKomponenPenilaian.findAll({ where: condition });
  return existing.reduce((total, item) => total + Number(item.bobot), 0);
}

class PenilaianController {
  static index = async (req, res) => {
    try {
      const { tahapan_id } = req.query;

      const condition = {};
      if (tahapan_id) condition.tahapan_id = tahapan_id;

      const data = await TaKomponenPenilaian.findAll({
        where: condition,
        order: [["id", "ASC"]],
        include: [{ model: TaTahapan, as: "tahapan" }],
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await TaKomponenPenilaian.findOne({
        where: { id },
        include: [{ model: TaTahapan, as: "tahapan" }],
      });

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
      const { tahapan_id, nama_komponen, bobot } = req.body;

      if (!tahapan_id || !nama_komponen || bobot == null) {
        return response(
          res,
          false,
          "Tahapan, nama komponen, dan bobot wajib diisi",
          null,
          400
        );
      }

      const totalExisting = await getTotalBobot(tahapan_id);
      if (totalExisting + Number(bobot) > 100) {
        return response(
          res,
          false,
          `Total bobot melebihi 100 (saat ini ${totalExisting}, ditambah ${bobot})`,
          null,
          400
        );
      }

      const casting = CastObject({ Model: TaKomponenPenilaian, body: req.body });
      const save = await TaKomponenPenilaian.create({
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
      const check = await TaKomponenPenilaian.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const tahapan_id = req.body.tahapan_id || check.tahapan_id;
      const bobot = req.body.bobot != null ? req.body.bobot : check.bobot;

      const totalExisting = await getTotalBobot(tahapan_id, id);
      if (totalExisting + Number(bobot) > 100) {
        return response(
          res,
          false,
          `Total bobot melebihi 100 (saat ini ${totalExisting}, ditambah ${bobot})`,
          null,
          400
        );
      }

      const casting = CastObject({ Model: TaKomponenPenilaian, body: req.body });
      delete casting.id;

      const update = await TaKomponenPenilaian.update(
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

      await TaKomponenPenilaian.update(
        { deleted_at: new Date() },
        { where: { id } }
      );

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = PenilaianController;
