const DB = require("../database");
const { deleteIp, getIp } = require("../helper/ipk");
const { updateGamifyKompetensi } = require("./gamifyKompetensi");
const { updateGamifyPenelitian } = require("./gamifyPenelitian");
const { updateGamifyPengabdian } = require("./gamifyPengabdian");
const { updateGamifyPenunjang } = require("./gamifyPenunjang");
const { updateGamifyRekomendasi } = require("./gamifyRekomendasi");

async function GamifyPoints(user_id, npm){
  try {
    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_ip_mhs WHERE user_id = $1 and is_deleted = $2",
      [user_id, false]
    );
  
    if(jumlahData.rows[0].count > 0){
      const reqDeleteIp = await deleteIp(user_id);
      const reqInsertIp = await getIp(user_id, npm);
    
      if(reqDeleteIp != 200 && reqInsertIp != 200){
        res.status(400);
        throw new Error("failed to delete and add ip data.");
      }
    } else if(jumlahData.rows[0].count <= 0){
        const reqInsertIp = await getIp(user_id, npm);
        if(reqInsertIp != 200){
          res.status(400);
          throw new Error("failed to delete and add ip data.");
        }
    }

    const querPointPendidikan = await DB.query('SELECT point_pendidikan FROM tb_data_pribadi WHERE user_id = $1', [user_id]);
  
    const pointKompetensi = await updateGamifyKompetensi(user_id);
    const pointPenelitian = await updateGamifyPenelitian(user_id);
    const pointPengabdian = await updateGamifyPengabdian(user_id);
    const pointPenunjang = await updateGamifyPenunjang(user_id);
    const pointRekomendasi = await updateGamifyRekomendasi(user_id);
    const pointPendidikan = Number(querPointPendidikan.rows[0].point_pendidikan);

    const Total = pointKompetensi + pointPenelitian + pointPengabdian + pointPenunjang + pointRekomendasi + pointPendidikan;

    const update = await DB.query(
      "UPDATE tb_data_pribadi SET total_point = $1 WHERE user_id = $2 RETURNING *",
      [Total, user_id]
    );

    if(!update.rows.length){
      res.status(400);
      throw new Error("Error Gamification!!!");
    }
    return 200;

  } catch (error) {
    console.error('Error fetching or inserting data:', error.message);
    throw new Error('Failed to retrieve or insert data.');
  }
}

module.exports = {
  GamifyPoints,
};