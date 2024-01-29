const DB = require("../database");

async function updateGamifyPenelitian(user_id){
  try {
    const sumPointPenelitian = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_publikasi JOIN tb_penelitian ON tb_penelitian.kategori_id = kategori_publikasi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const sumPointPublikasi = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_publikasi JOIN tb_publikasi_karya ON tb_publikasi_karya.kategori_id = kategori_publikasi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const sumPointHki = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_hki JOIN tb_hki ON tb_hki.kategori_id = kategori_hki.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const totalPenelitan = Number(sumPointPenelitian.rows[0].total_points);
    const totalPublikasi = Number(sumPointPublikasi.rows[0].total_points);
    const totalHki = Number(sumPointHki.rows[0].total_points);
    
    const Total = totalPenelitan + totalPublikasi + totalHki;  
  
    const update = await DB.query(
      "UPDATE tb_data_pribadi SET point_penelitian = $1 WHERE user_id = $2 RETURNING *",
      [Total, user_id]
    );
  
    // console.log("point_penelitian:", update.rows[0].point_penelitian);
    return update.rows[0].point_penelitian;
  } catch (error) {
    console.error('Error fetching or inserting data Penelitian:', error);
    throw new Error('Failed to retrieve or insert data Penelitian.');
  }
 

}

module.exports = {
  updateGamifyPenelitian,
};