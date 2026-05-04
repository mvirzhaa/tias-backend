const { response } = require("../../lib/response");
const { default: axios } = require("axios");

class UjianController {
  static index = async (req, res) => {
    try {
      const API_URL = `${process.env.API_CPL}/soal-parent`;

      const getingData = await axios.get(API_URL, {
        params: req.query,
      });

      return response(res, true, "success", getingData?.data?.data);
    } catch (error) {
      console.log(error);
      return response(res, false, error.message, error);
    }
  };

  static soal = async (req, res) => {
    try {
      const API_URL = `${process.env.API_CPL}/soal`;

      const getingData = await axios.get(API_URL, {
        params: req.query,
      });

      return response(res, true, "success", getingData?.data?.data);
    } catch (error) {
      console.log(error);
      return response(res, false, error.message, error);
    }
  };

  static submit = async (req, res) => {
    try {
      const API_URL = `${process.env.API_CPL}/nilai-soal/bulkStore`;

      const result = await axios.post(API_URL, req.body, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!result.data || result.data.data !== true) {
        return response(res, false, "Terjadi kesalahan pada server", null);
      }

      return response(res, true, "Jawaban Berhasil disimpan", null);
    } catch (error) {
      console.error(
        "Error saat mengakses API:",
        error.response?.data || error.message
      );

      return response(
        res,
        false,
        error.message || "Terjadi kesalahan pada server",
        null
      );
    }
  };
}

module.exports = UjianController;
