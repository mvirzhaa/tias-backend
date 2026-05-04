const DB = require("../database");

async function updateGamifyKompetensi(user_id){

  try {
    const sumPointSertifikasi = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_sertifikasi JOIN tb_sertifikasi ON tb_sertifikasi.kategori_id = kategori_sertifikasi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const sumPointTes = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_sertifikasi JOIN tb_tes ON tb_tes.kategori_id = kategori_sertifikasi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const totalPointsSertifikasi = Number(sumPointSertifikasi.rows[0].total_points);
    const totalPointsTes = Number(sumPointTes.rows[0].total_points);
    
    const Total = totalPointsSertifikasi + totalPointsTes;  
  
    const update = await DB.query(
      "UPDATE tb_data_pribadi SET point_kompetensi = $1 WHERE user_id = $2 RETURNING *",
      [Total, user_id]
    );
  
    // console.log("point Kompetensi:", update.rows[0].point_kompetensi);
    return update.rows[0].point_kompetensi;
  } catch (error) {
    console.error('Error fetching or inserting data Kompetensi:', error);
    throw new Error('Failed to retrieve or insert data Kompetensi.');
  }
}

module.exports = {
  updateGamifyKompetensi,
};