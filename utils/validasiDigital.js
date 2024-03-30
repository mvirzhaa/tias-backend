const { unixTimestamp, convertDate } = require(".");
const DB_ = require("../database");

async function insertValidasiDokumen(data = {}) {
  try {
    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const saveData = await DB_.query(
      "INSERT INTO validasi_dokumen(dosen_id, mhs_id, nama_kegiatan, link_kegiatan, created_at) VALUES($1, $2, $3, $4, $5) RETURNING id",
      [
        data.dosen_id,
        data.mhs_id,
        data.nama_kegiatan,
        data.link_kegiatan,
        convert,
      ]
    );

    const idValidasiBaru = saveData.rows[0].id;

    const linkValidasi = `${process.env.FRONTEND_URL}/validasi-dokumen/${idValidasiBaru}`;

    const update = await DB_.query(
      "UPDATE validasi_dokumen SET link_validasi = $1 WHERE id = $2 RETURNING *",
      [linkValidasi, idValidasiBaru]
    );

    return update.rows[0];
  } catch (error) {
    console.error("Terjadi kesalahan saat menyimpan data validasi:", error);
    throw new Error("Gagal menyimpan atau memperbarui data validasi.");
  }
}

module.exports = {
  insertValidasiDokumen,
};
