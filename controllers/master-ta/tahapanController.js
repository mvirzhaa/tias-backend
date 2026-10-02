const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const TaTahapan = require("../../models/master-ta/TaTahapan");
const TaSkema = require("../../models/master-ta/TaSkema");
const SiakV2ProgramStudi = require("../../models/lms/SiakV2ProgramStudi");

class TahapanController {
  static index = async (req, res) => {
    try {
      const { prodi_id, skema_id } = req.query;

      const condition = {};
      if (prodi_id) condition.prodi_id = prodi_id;
      if (skema_id) condition.skema_id = skema_id;

      const data = await TaTahapan.findAll({
        where: condition,
        order: [["id", "ASC"]],
        include: [
          { model: TaSkema, as: "skema", required: false },
          { model: SiakV2ProgramStudi, as: "prodi", required: false },
        ],
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await TaTahapan.findOne({
        where: { id },
        include: [
          { model: TaSkema, as: "skema", required: false },
          { model: SiakV2ProgramStudi, as: "prodi", required: false },
        ],
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
      const { prodi_id, skema_id, nama_tahapan } = req.body;

      if (!prodi_id || !skema_id || !nama_tahapan) {
        return response(
          res,
          false,
          "Prodi, skema, dan nama tahapan wajib diisi",
          null,
          400
        );
      }

      const casting = CastObject({ Model: TaTahapan, body: req.body });
      const save = await TaTahapan.create({
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
      const check = await TaTahapan.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const casting = CastObject({ Model: TaTahapan, body: req.body });
      delete casting.id;

      const update = await TaTahapan.update(
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

      await TaTahapan.update({ deleted_at: new Date() }, { where: { id } });

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = TahapanController;
