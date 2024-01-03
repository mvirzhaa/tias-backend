const asyncHandler = require("express-async-handler");
const DB = require("../../database");

const getCount = async (table, userLoginId) => {
  const result = await DB.query(
    `SELECT COUNT(*) FROM ${table} WHERE user_id = $1 AND status = $2 AND is_deleted = $3`,
    [userLoginId, 1, false]
  );
  return result.rows[0].count;
};

exports.dashboardData = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const tes = await getCount("tb_tes", userLoginId);
  const sertifikasi = await getCount("tb_sertifikasi", userLoginId);
  const pembicara = await getCount("tb_pembicara", userLoginId);
  const pengabdian = await getCount("tb_pengabdian", userLoginId);
  const penghargaan = await getCount("tb_penghargaan", userLoginId);
  const penelitian = await getCount("tb_penelitian", userLoginId);
  const publikasi = await getCount("tb_publikasi_karya", userLoginId);
  const hki = await getCount("tb_hki", userLoginId);

  const getTotalPointQuery = `
    SELECT point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi AS total_points
    FROM tb_data_pribadi
    WHERE user_id = $1
  `;

  const updateTotalPointQuery = `
    UPDATE tb_data_pribadi
    SET total_point = $1
    WHERE user_id = $2
  `;

  const checkUserDataQuery = `
    SELECT *
    FROM tb_data_pribadi
    WHERE user_id = $1
  `;

  const getTotalPoint = await DB.query(getTotalPointQuery, [userLoginId]);
  const totalPoints = getTotalPoint.rows[0].total_points;

  await DB.query(updateTotalPointQuery, [totalPoints, userLoginId]);

  const userData = await DB.query(checkUserDataQuery, [userLoginId]);

  let responseData;

  if (userData.rows[0].kode_mhs === null) {
    responseData = userData.rows[0];
  } else {
    const query = `
      SELECT tb_data_pribadi.*, kategori_mhs.status_mhs, tb_users.npm, tb_users.nidn, tb_users.role
      FROM tb_data_pribadi
      JOIN kategori_mhs ON tb_data_pribadi.kode_mhs = kategori_mhs.kode
      JOIN tb_users ON tb_data_pribadi.user_id = tb_users.user_id
      WHERE tb_data_pribadi.user_id = $1
    `;

    const dataPribadi = await DB.query(query, [userLoginId]);
    responseData = dataPribadi.rows[0];
  }

  res.status(200).json({
    status: "success",
    data: {
      tes,
      sertifikasi,
      pembicara,
      pengabdian,
      penghargaan,
      penelitian,
      publikasi,
      hki,
      userData: responseData, 
    },
  });
});

