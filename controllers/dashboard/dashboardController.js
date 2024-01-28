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
  const role = req.user.role;

  try {
    const tes = await getCount("tb_tes", userLoginId);
    const sertifikasi = await getCount("tb_sertifikasi", userLoginId);
    const pembicara = await getCount("tb_pembicara", userLoginId);
    const pengabdian = await getCount("tb_pengabdian", userLoginId);
    const penghargaan = await getCount("tb_penghargaan", userLoginId);
    const penelitian = await getCount("tb_penelitian", userLoginId);
    const publikasi = await getCount("tb_publikasi_karya", userLoginId);
    const hki = await getCount("tb_hki", userLoginId);

    const responseData = await DB.query(`SELECT tb_data_pribadi.*, tb_users.nidn, tb_users.npm, tb_users.role
      FROM tb_data_pribadi
      JOIN tb_users ON tb_data_pribadi.user_id = tb_users.user_id
      WHERE tb_data_pribadi.user_id = $1`, [userLoginId]);

    const sks = 21;
    const pertemuanPerkuliahan = 22;
    const belum_kolo = 5;
    const besum_sidang = 8;
    const belum_revisi = 2;
    const kp_selesai = 8;

    let data;

    if (role === "Mahasiswa") {
      data = {
        tes,
        sertifikasi,
        pembicara,
        pengabdian,
        penghargaan,
        penelitian,
        publikasi,
        hki,
        userData: responseData.rows[0],
      };
    } else {
      data = {
        sks,
        pertemuanPerkuliahan,
        belum_kolo,
        besum_sidang,
        belum_revisi,
        kp_selesai,
        userData: responseData.rows[0],
      };
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



const getCountPending = async (table) => {
  try {
    const result = await DB.query(
      `SELECT COUNT(*) FROM ${table} WHERE status = $1 AND is_deleted = $2`,
      [0, false]
    );
    return result.rows[0].count;
  } catch (error) {
    console.error(`Error in getCount for table ${table}:`, error);
    throw error; // Re-throw the error to propagate it up the call stack
  }
};


exports.dashboardDataAdmin = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  try {
    const tes = await getCountPending("tb_tes");
    const sertifikasi = await getCountPending("tb_sertifikasi");
    const pembicara = await getCountPending("tb_pembicara");
    const pengabdian = await getCountPending("tb_pengabdian");
    const penghargaan = await getCountPending("tb_penghargaan");
    const penelitian = await getCountPending("tb_penelitian");
    const publikasi = await getCountPending("tb_publikasi_karya");
    const hki = await getCountPending("tb_hki");


    const userAdmin = await DB.query("SELECT tb_data_pribadi.*, tb_users.npm, tb_users.nidn, tb_users.role FROM tb_data_pribadi JOIN tb_users ON tb_data_pribadi.user_id = tb_users.user_id WHERE tb_data_pribadi.user_id = $1", [userLoginId])

    const data = {
        tes,
        sertifikasi,
        pembicara,
        pengabdian,
        penghargaan,
        penelitian,
        publikasi,
        hki,
        userData: userAdmin.rows[0],
    }


    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});