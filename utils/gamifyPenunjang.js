const DB = require("../database");

async function updateGamifyPenunjang(user_id){
  try {
    const sumPointProfesi = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_profesi JOIN tb_anggota_prof ON tb_anggota_prof.kategori_id = kategori_profesi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const sumPointPrestasi = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_prestasi JOIN tb_penghargaan ON tb_penghargaan.kategori_id = kategori_prestasi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const totalProfesi = Number(sumPointProfesi.rows[0].total_points);
    const totalPrestasi = Number(sumPointPrestasi.rows[0].total_points);
    
    const Total = totalProfesi + totalPrestasi;  
  
    const update = await DB.query(
      "UPDATE tb_data_pribadi SET point_penunjang = $1 WHERE user_id = $2 RETURNING *",
      [Total, user_id]
    );
  
    // console.log("point Penunjang:", update.rows[0].point_penunjang);
    return update.rows[0].point_penunjang; 
  } catch (error) {
    console.error('Error fetching or inserting data penunjang:', error);
    throw new Error('Failed to retrieve or insert data penunjang.');
  }
}

module.exports = {
  updateGamifyPenunjang,
};