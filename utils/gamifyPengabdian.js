const DB = require("../database");

async function updateGamifyPengabdian(user_id){
  try {
    const sumPointPengabdian = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_publikasi JOIN tb_pengabdian ON tb_pengabdian.kategori_id = kategori_publikasi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const sumPointPembicara = await DB.query(
      "SELECT SUM(point) AS total_points FROM kategori_publikasi JOIN tb_pembicara ON tb_pembicara.kategori_id = kategori_publikasi.id WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [user_id, 1, false]
    );
  
    const totalPengabdian = Number(sumPointPengabdian.rows[0].total_points);
    const totalPublikasi = Number(sumPointPembicara.rows[0].total_points);
    
    const Total = totalPengabdian + totalPublikasi;  
  
    const update = await DB.query(
      "UPDATE tb_data_pribadi SET point_pengabdian = $1 WHERE user_id = $2 RETURNING *",
      [Total, user_id]
    );
  
    // console.log("point_pengabdian:", update.rows[0].point_pengabdian);
    return update.rows[0].point_pengabdian; 
  } catch (error) {
    console.error('Error fetching or inserting data pengabdian:', error);
    throw new Error('Failed to retrieve or insert data pengabdian.');
  }
}

module.exports = {
  updateGamifyPengabdian,
};