const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const TaKelengkapan = require("../../models/master-ta/TaKelengkapan");

class KelengkapanController {
  static index = async (req, res) => {
    try {
      const { tahapan_id } = req.query;

      const condition = {};
      if (tahapan_id) condition.tahapan_id = tahapan_id;

      const data = await TaKelengkapan.findAll({
        where: condition,
        order: [["id", "ASC"]],
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static create = async (req, res) => {
    try {
      const { tahapan_id, nama_kelengkapan } = req.body;

      if (!tahapan_id || !nama_kelengkapan) {
        return response(
          res,
          false,
          "Tahapan dan nama kelengkapan wajib diisi",
          null,
          400
        );
      }

      const casting = CastObject({ Model: TaKelengkapan, body: req.body });
      const save = await TaKelengkapan.create({
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
      const check = await TaKelengkapan.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const casting = CastObject({ Model: TaKelengkapan, body: req.body });
      delete casting.id;

      const update = await TaKelengkapan.update(
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

      await TaKelengkapan.update(
        { deleted_at: new Date() },
        { where: { id } }
      );

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = KelengkapanController;
