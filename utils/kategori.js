const DB = require("../database");

async function getKategoriSertifikasi(){
  try {
    const response = await DB.query("SELECT * FROM kategori_sertifikasi");

    const results = response.rows;

    return results;
  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

module.exports = {
  getKategoriSertifikasi
};
