const axios = require('axios');
const DB = require('../database'); 
const { unixTimestamp, convertDate } = require('../utils');
const { getKategoriIp } = require('./kategori_ip');

async function getIp(user_id, npm) {
  const API_URL = `https://skpi.uika-bogor.ac.id/restApi/index.php?menu=nilai&code=${npm}`;

  try {
    const response = await axios.get(API_URL);

    const data = {
      npm: response.data.student_code,
      ipk: response.data.ipk,
      total: response.data.Total,
      data_ips: response.data.Data,
    };

    const ipCode = await getKategoriIp();

    for (let i = 0; i < data.total; i++) {
      const ip = data.data_ips[i].ips; 

      let kodeIp;

      if (ip === 0 || ip < 1.0) {
        kodeIp = ipCode.p1.kode;
      } else if (ip >= 1.0 && ip <= 1.49) {
        kodeIp = ipCode.p2.kode;
      } else if (ip >= 1.5 && ip <= 1.99) {
        kodeIp = ipCode.p3.kode;
      } else if (ip >= 2.0 && ip <= 2.49) {
        kodeIp = ipCode.p4.kode;
      } else if (ip >= 2.5 && ip <= 2.99) {
        kodeIp = ipCode.p5.kode;
      } else if (ip >= 3.0 && ip <= 3.49) {
        kodeIp = ipCode.p6.kode;
      } else if (ip >= 3.5 && ip <= 3.6) {
        kodeIp = ipCode.p7.kode;
      } else if (ip > 3.6 && ip <= 3.7) {
        kodeIp = ipCode.p8.kode;
      } else if (ip > 3.7 && ip <= 3.8) {
        kodeIp = ipCode.p9.kode;
      } else if (ip > 3.8 && ip <= 3.9) {
        kodeIp = ipCode.p10.kode;
      } else if (ip > 3.9 && ip <= 4.0) {
        kodeIp = ipCode.p11.kode;
      }

      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const dataInsert = {
        user_id: user_id,
        semester: data.data_ips[i].semester,
        academic_year: data.data_ips[i].academic_year,
        ips: ip,
        kode: kodeIp,
        created_at: convert 
      }

      await DB.query('INSERT INTO tb_ip_mhs(user_id, semester, tahun, ip, kode_ip, created_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', [dataInsert.user_id, dataInsert.semester, dataInsert.academic_year, dataInsert.ips, dataInsert.kode, dataInsert.created_at, 1]);
    }

    const getIp = await DB.query(
      `SELECT COUNT(*) FROM tb_ip_mhs JOIN kategori_ip ON tb_ip_mhs.kode_ip = kategori_ip.kode WHERE user_id = $1 AND status = $2 AND is_deleted = $3`,
      [user_id, 1, false]
    );
     const totalIpMhs = getIp.rows[0].count;
  
  
    if(totalIpMhs > 0){
      const sumPoint = await DB.query(
        "SELECT SUM(point) AS total_points FROM kategori_ip JOIN tb_ip_mhs ON tb_ip_mhs.kode_ip = kategori_ip.kode WHERE user_id = $1 and status = $2 and is_deleted = $3",
        [user_id, 1, false]
      );
  
      const totalPoints = sumPoint.rows[0].total_points;
  
      await DB.query(
        "UPDATE tb_data_pribadi SET point_pendidikan = $1 WHERE user_id = $2",
        [totalPoints, user_id]
      );
    }

    const status = 200;

    return status;

  } catch (error) {
    console.error('Error fetching or inserting data IPS:', error.message);
    throw new Error('Failed to retrieve or insert data IPS.');
  }
}

async function deleteIp(user_id){
  try {
    await DB.query('DELETE FROM tb_ip_mhs WHERE user_id = $1', [user_id]);

    const status = 200;
    return status;

  } catch (error) {
    console.error('Error fetching or delete data:', error.message);
    throw new Error('Failed to retrieve or delete data.');
  }
}

module.exports = {
  getIp,
  deleteIp
};
