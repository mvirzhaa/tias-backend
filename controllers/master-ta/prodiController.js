const { response } = require("../../lib/response");
const SiakV2ProgramStudi = require("../../models/lms/SiakV2ProgramStudi");

class ProdiController {
  static index = async (req, res) => {
    try {
      const data = await SiakV2ProgramStudi.findAll({
        where: { is_active: true },
        order: [["nama_prodi", "ASC"]],
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = ProdiController;
