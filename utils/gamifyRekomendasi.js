const DB = require("../database");

async function updateGamifyRekomendasi(user_id){
  try {
    const jumlahDataRekomen = await DB.query(
      "SELECT COUNT(*) FROM rekomendasi_mhs WHERE mahasiswa_id = $1",
      [user_id]
    );
  
    const findUsePoint = await DB.query("SELECT point FROM point_rekomendasi WHERE status = $1", [1]);
  
    const pointUse = Number(findUsePoint.rows[0].point)
  
    const totalData = jumlahDataRekomen.rows[0].count * pointUse;
  
    const update = await DB.query(
      "UPDATE tb_data_pribadi SET point_rekomendasi = $1 WHERE user_id = $2 RETURNING *",
      [totalData, user_id]
    );
  
    return update.rows[0].point_rekomendasi;
  } catch (error) {
    console.error('Error fetching or inserting data rekomendasi:', error);
    throw new Error('Failed to retrieve or insert data rekomendasi.');
  }
}

module.exports = {
  updateGamifyRekomendasi,
};