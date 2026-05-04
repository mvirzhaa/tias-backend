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

async function getKategoriProfesi(){
  try {
    const response = await DB.query("SELECT * FROM kategori_profesi");

    const results = response.rows;

    return results;
  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

async function getKategoriPrestasi(){
  try {
    const response = await DB.query("SELECT * FROM kategori_prestasi");

    const results = response.rows;

    return results;
  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

async function getKategoriPublikasi(){
  try {
    const response = await DB.query("SELECT * FROM kategori_publikasi");

    const results = response.rows;

    return results;
  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}
module.exports = {
  getKategoriSertifikasi,
  getKategoriProfesi,
  getKategoriPrestasi,
  getKategoriPublikasi
};
