const asyncHandler = require("express-async-handler");
const DB = require("../../database");

const getCount = async (table, userLoginId) => {
  const result = await DB.query(
    `SELECT COUNT(*) FROM ${table} WHERE user_id = $1 and status = $2  and is_deleted = $3`,
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

  res.status(201).json({
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
    },
  });
});
