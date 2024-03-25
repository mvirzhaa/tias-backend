const { unixTimestamp, convertDate } = require(".");
const DB_VALIDASI = require("../db-validasi-digital");

async function insertValidasiDokumen(data = {}) {
  try {
    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    // Lakukan query untuk menyimpan data ke dalam tabel validasi_dokumen
    const saveData = await DB_VALIDASI.query(
      "INSERT INTO validasi_dokumen(dosen_id, mhs_id, nama_kegiatan, link_kegiatan, created_at) VALUES($1, $2, $3, $4, $5) RETURNING id",
      [
        data.dosen_id,
        data.mhs_id,
        data.nama_kegiatan,
        data.link_kegiatan,
        convert,
      ]
    );

    // Dapatkan id yang baru saja dimasukkan
    const idValidasiBaru = saveData.rows[0].id;

    // Buat link validasi dengan menggunakan id yang baru saja dimasukkan
    const linkValidasi = `${process.env.FRONTEND_URL}/validasi-dokumen/${idValidasiBaru}`;

    // Lakukan query untuk memperbarui data dengan menambahkan link validasi
    const update = await DB_VALIDASI.query(
      "UPDATE validasi_dokumen SET link_validasi = $1 WHERE id = $2 RETURNING *",
      [linkValidasi, idValidasiBaru]
    );

    // Mengembalikan data yang telah diperbarui
    return update.rows[0];
  } catch (error) {
    console.error("Terjadi kesalahan saat menyimpan data validasi:", error);
    throw new Error("Gagal menyimpan atau memperbarui data validasi.");
  }
}

module.exports = {
  insertValidasiDokumen,
};
