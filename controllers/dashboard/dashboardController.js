const asyncHandler = require("express-async-handler");
const DB = require("../../database");


const getCount = async (table, userLoginId) => {
  try {
    const result = await DB.query(
      `SELECT COUNT(*) FROM ${table} WHERE user_id = $1 AND status = $2 AND is_deleted = $3`,
      [userLoginId, 1, false]
    );
    return result.rows[0].count;
  } catch (error) {
    console.error(`Error in getCount for table ${table}:`, error);
    throw error; // Re-throw the error to propagate it up the call stack
  }
};

exports.dashboardData = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  try {
    const tes = await getCount("tb_tes", userLoginId);
    const sertifikasi = await getCount("tb_sertifikasi", userLoginId);
    const pembicara = await getCount("tb_pembicara", userLoginId);
    const pengabdian = await getCount("tb_pengabdian", userLoginId);
    const penghargaan = await getCount("tb_penghargaan", userLoginId);
    const penelitian = await getCount("tb_penelitian", userLoginId);
    const publikasi = await getCount("tb_publikasi_karya", userLoginId);
    const hki = await getCount("tb_hki", userLoginId);

    const updateTotalPointQuery = `
      UPDATE tb_data_pribadi
      SET total_point = point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi
      WHERE user_id = $1
      RETURNING *
    `;

    const updatedUserData = await DB.query(updateTotalPointQuery, [userLoginId]);

    const userData = updatedUserData.rows.length > 0 ? updatedUserData.rows[0] : null;

    let responseData;


    if (userData && userData.kode_mhs === null) {
      responseData = userData;
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


    const data = {
        tes,
        sertifikasi,
        pembicara,
        pengabdian,
        penghargaan,
        penelitian,
        publikasi,
        hki,
        userData: responseData,
    }

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.error("Error in dashboardData:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});


