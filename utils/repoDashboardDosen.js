const DB = require("../database");
const DB_BA = require("../db-bimbingan-akademik");

async function getMhsBimbinganTA(userId) {
  try {
    let query = `SELECT 
      ta_pengajuan_sk.*, 
      ta_pendaftaran_kolokium.kolo_pembimbing_1,
      ta_pendaftaran_kolokium.id AS kolo_id,
      ta_pendaftaran_kolokium.kolo_pembimbing_2,
      ta_pendaftaran_kolokium.kolo_pembimbing_3,
      ta_pendaftaran_kolokium.pengajuan_sk_id,
      ta_pendaftaran_kolokium.evaluator_1,
      ta_pendaftaran_kolokium.evaluator_2,
      ta_pendaftaran_sidang.sidang_pembimbing_1,
      ta_pendaftaran_sidang.id AS sidang_id,
      ta_pendaftaran_sidang.sidang_pembimbing_2,
      ta_pendaftaran_sidang.sidang_pembimbing_3,
      ta_pendaftaran_sidang.pengajuan_sk_id AS sidang_sk_id,
      ta_pendaftaran_sidang.penguji_1,
      ta_pendaftaran_sidang.penguji_2,
      tb_data_pribadi.nama_lengkap, 
      tb_users.npm,
      CONCAT(
          CASE WHEN ta_pengajuan_sk.sk_pembimbing_1 = '${userId}' THEN 'SK Pembimbing 1 | ' ELSE '' END,
          CASE WHEN ta_pengajuan_sk.sk_pembimbing_2 = '${userId}' THEN 'SK Pembimbing 2 | ' ELSE '' END,
          CASE WHEN ta_pengajuan_sk.sk_pembimbing_3 = '${userId}' THEN 'SK Pembimbing 3 | ' ELSE '' END,
          CASE WHEN ta_pengajuan_sk.kepala_lab = '${userId}' THEN 'Kepala Lab | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_kolokium.evaluator_1 = '${userId}' THEN 'Evaluator 1 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_kolokium.evaluator_2 = '${userId}' THEN 'Evaluator 2 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_sidang.penguji_1 = '${userId}' THEN 'Penguji 1 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_sidang.penguji_2 = '${userId}' THEN 'Penguji 2 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userId}' THEN 'Pembimbing Kolokium 1 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userId}' THEN 'Pembimbing Kolokium 2 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userId}' THEN 'Pembimbing Kolokium 3 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_kolokium.kolo_kepala_lab = '${userId}' THEN 'Kepala Lab | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userId}' THEN 'Pembimbing Sidang 1 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userId}' THEN 'Pembimbing Sidang 2 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userId}' THEN 'Pembimbing Sidang 3 | ' ELSE '' END,
          CASE WHEN ta_pendaftaran_sidang.sidang_kepala_lab = '${userId}' THEN 'Kepala Lab | ' ELSE '' END
      ) AS peran 
    FROM  
      ta_pengajuan_sk 
    JOIN 
      tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id 
    JOIN 
      tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id 
    JOIN 
      ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id  
    JOIN 
      ta_pendaftaran_sidang ON ta_pengajuan_sk.id = ta_pendaftaran_sidang.pengajuan_sk_id
    WHERE 
      (ta_pengajuan_sk.sk_pembimbing_1 = '${userId}' OR 
      ta_pengajuan_sk.sk_pembimbing_2 = '${userId}' OR 
      ta_pengajuan_sk.sk_pembimbing_3 = '${userId}' OR 
      ta_pengajuan_sk.kepala_lab = '${userId}' OR 
      ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userId}' OR 
      ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userId}' OR 
      ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userId}' OR
      ta_pendaftaran_kolokium.kolo_kepala_lab = '${userId}' OR
      ta_pendaftaran_kolokium.evaluator_1 = '${userId}' OR
      ta_pendaftaran_kolokium.evaluator_2 = '${userId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userId}' OR 
      ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userId}' OR 
      ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userId}' OR
      ta_pendaftaran_sidang.sidang_kepala_lab = '${userId}' OR
      ta_pendaftaran_sidang.penguji_1 = '${userId}' OR
      ta_pendaftaran_sidang.penguji_2 = '${userId}') AND ta_pengajuan_sk.deleted_at IS NULL
    `;

    const response = await DB.query(query);
    const results = response.rows;

    let pengajuan_sk = 0;
    let menuju_kolokium = 0;
    let menuju_sidang = 0;
    let menyelesaikan_revisi = 0;
    let selesai = 0;

    for (const iterator of results) {
      if (iterator.status === "pengajuan-sk") {
        pengajuan_sk++;
      }
      if (iterator.status === "menuju-kolokium") {
        menuju_kolokium++;
      }
      if (iterator.status === "menuju-sidang") {
        menuju_sidang++;
      }
      if (iterator.status === "menyelesaikan-revisi") {
        menyelesaikan_revisi++;
      }
      if (iterator.status === "selesai") {
        selesai++;
      }
    }

    // Hitung jumlah peran
    let pembimbing1Count = 0;
    let pembimbing2Count = 0;
    let penguji1Count = 0;
    let penguji2Count = 0;

    for (const result of results) {
      if (
        result.kolo_pembimbing_1 === userId &&
        result.sidang_pembimbing_1 === userId
      ) {
        pembimbing1Count++;
      }
      if (
        result.kolo_pembimbing_2 === userId &&
        result.sidang_pembimbing_2 === userId
      ) {
        pembimbing2Count++;
      }
      if (result.penguji_1 === userId) {
        penguji1Count++;
      }
      if (result.penguji_2 === userId) {
        penguji2Count++;
      }
    }

    return {
      results,
      pembimbing1Count,
      pembimbing2Count,
      penguji1Count,
      penguji2Count,
      pengajuan_sk,
      menuju_kolokium,
      menuju_sidang,
      menyelesaikan_revisi,
      selesai,
    };
  } catch (error) {
    throw new Error("failed to retrieve mhs bimbingan TA data.");
  }
}

async function getMhsBimbinganAkademik(userId) {
  try {
    const findData = await DB_BA.query(
      `SELECT tb_bk.*, mhs_bk.mhs_id, mhs_bk.bk_id 
       FROM tb_bk 
       JOIN mhs_bk ON tb_bk.id = mhs_bk.bk_id 
       WHERE tb_bk.dosen_id = '${userId}'`
    );

    return findData.rowCount;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to retrieve bimbingan akademik data.");
  }
}

module.exports = {
  getMhsBimbinganTA,
  getMhsBimbinganAkademik,
};
