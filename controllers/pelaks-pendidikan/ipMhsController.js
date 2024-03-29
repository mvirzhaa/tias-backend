const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");
const { deleteIp, getIp } = require("../../helper/ipk");

// exports.addDataIp = asyncHandler(async (req, res) => {
//   const userLoginId = req.user.user_id;

//   const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
//     userLoginId,
//   ]);

//   if (user.rows.length) {
//     const data = req.body;

//     if (!data.semester || !data.tahun || !data.ip) {
//       res.status(400);
//       throw new Error("Pleas fill in all the required fields.");
//     }

//     const ip = data.ip;
//     let pointIp;
//     if (ip == 0 || ip < 1.0) {
//       pointIp = 175;
//     } else if (ip >= 1.0 && ip <= 1.49) {
//       pointIp = 240;
//     } else if (ip >= 1.5 && ip <= 1.99) {
//       pointIp = 300;
//     } else if (ip >= 2.0 && ip <= 2.49) {
//       pointIp = 355;
//     } else if (ip >= 2.5 && ip <= 2.99) {
//       pointIp = 405;
//     } else if (ip >= 3.0 && ip <= 3.49) {
//       pointIp = 450;
//     } else if (ip >= 3.5 && ip <= 3.6) {
//       pointIp = 490;
//     } else if (ip > 3.6 && ip <= 3.7) {
//       pointIp = 525;
//     } else if (ip > 3.7 && ip <= 3.8) {
//       pointIp = 555;
//     } else if (ip > 3.8 && ip <= 3.9) {
//       pointIp = 580;
//     } else if (ip > 3.9 && ip <= 4.0) {
//       pointIp = 600;
//     }

//     const created_at = unixTimestamp;
//     const convert = convertDate(created_at);

//     const keys = ["user_id", ...Object.keys(data), "created_at", "point"];
//     const values = [userLoginId, ...Object.values(data), convert, pointIp];
//     const placeholders = keys.map((key, index) => `$${index + 1}`);

//     // save data
//     const saveData = await DB.query(
//       `INSERT INTO tb_ip_mhs(${keys.join(", ")}) VALUES (${placeholders.join(
//         ", "
//       )}) returning *`,
//       values
//     );

//     if (saveData.rows) {
//       res.status(200).json({
//         message: "Successfull created data.",
//         data: saveData.rows[0],
//       });
//     } else {
//       res.status(400);
//       throw new Error("Invalid data.");
//     }
//   } else {
//     res.status(404);
//     throw new Error("User not found.");
//   }
// });

exports.getDataIP = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.query;

  if (data.semester || data.ip || data.tahun || data.status) {
    const semester = data.semester || null;
    const ip = data.ip || null;
    const tahun = data.tahun || null;
    const status = data.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_ip($1, $2, $3, $4, $5)`,
      [semester, ip, tahun, userLoginId, status]
    );

    res.status(201).json({
      data: findData.rows,
    });
  } else {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const sortByName = req.query.sortByName;
    const sorting = req.query.sorting;

    const offset = (page - 1) * limit;

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_ip_mhs WHERE user_id = $1 and is_deleted = $2",
      [userLoginId, false]
    );
    const findNpm = await DB.query(
      "SELECT npm FROM tb_users WHERE user_id = $1",
      [userLoginId]
    );

    const npm = findNpm.rows[0].npm;

    if (jumlahData.rows[0].count > 0) {
      const reqDeleteIp = await deleteIp(userLoginId);
      const reqInsertIp = await getIp(userLoginId, npm);

      if (reqDeleteIp != 200 && reqInsertIp != 200) {
        res.status(400);
        throw new Error("failed to delete and add ip data.");
      }
    }

    let queryText =
      "SELECT * FROM tb_ip_mhs JOIN kategori_ip ON tb_ip_mhs.kode_ip = kategori_ip.kode WHERE user_id = $1 AND is_deleted = $2";

    if (sortByName && sorting) {
      queryText += ` ORDER BY ${sortByName} ${
        sorting === "desc" ? "DESC" : "ASC"
      }`;
    }

    queryText += " LIMIT $3 OFFSET $4";

    const dataIP = await DB.query(queryText, [
      userLoginId,
      false,
      limit,
      offset,
    ]);

    const ipAprove = await DB.query(
      "SELECT * FROM tb_ip_mhs WHERE user_id = $1 and is_deleted = $2",
      [userLoginId, false]
    );

    const ipArr = ipAprove.rows.map((row) => row.ip);
    const totalIp = ipArr.reduce((total, ip) => total + ip, 0);
    const jumlahSemester = ipArr.length;
    const ipk = totalIp / jumlahSemester;

    res.status(201).json({
      data: dataIP.rows,
      totalData: jumlahData.rows[0].count,
      ipk: ipk.toFixed(2),
    });
  }
});

// exports.detailDataIp = asyncHandler(async (req, res) => {
//   const { ipId } = req.params;

//   const findData = await DB.query("SELECT * FROM tb_ip_mhs WHERE ip_id = $1", [
//     ipId,
//   ]);

//   if (!findData.rows.length) {
//     res.status(404);
//     throw new Error("Data not found.");
//   }

//   res.status(201).json({
//     data: findData.rows[0],
//   });
// });

// exports.editDataIp = asyncHandler(async (req, res) => {
//   const { ipId } = req.params;

//   const findData = await DB.query("SELECT * FROM tb_ip_mhs WHERE ip_id = $1", [
//     ipId,
//   ]);

//   if (findData.rows[0].status == 1) {
//     res.status(400);
//     throw new Error("Your data already approved.");
//   }

//   if (findData.rows.length) {
//     const data = req.body;

//     const updated_at = unixTimestamp;
//     const convert = convertDate(updated_at);
//     const statusValue =
//       findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

//     const entries = Object.entries({
//       ...data,
//       status: statusValue,
//       updated_at: convert,
//     });
//     const setQuery = entries
//       .map(([key, _], index) => `${key} = $${index + 1}`)
//       .join(", ");

//     const saveData = await DB.query(
//       `UPDATE tb_ip_mhs SET ${setQuery} WHERE ip_id = '${findData.rows[0].ip_id}' `,
//       entries.map(([_, value]) => value)
//     );

//     res.status(201).json({
//       message: "Successfully update data.",
//       data: saveData.rows[0],
//     });
//   } else {
//     res.status(404);
//     throw new Error("Data not found.");
//   }
// });

// exports.deleteDataIp = asyncHandler(async (req, res) => {
//   const { ipId } = req.params;

//   const findData = await DB.query("SELECT * FROM tb_ip_mhs WHERE ip_id = $1", [
//     ipId,
//   ]);

//   if (!findData.rows.length) {
//     res.status(400);
//     throw new Error("Data not found.");
//   }

//   const created_at = unixTimestamp;
//   const convert = convertDate(created_at);

//   const deleteData = await DB.query(
//     "UPDATE tb_ip_mhs SET is_deleted = $1, deleted_at = $2 WHERE ip_id = $3 returning *",
//     [true, convert, findData.rows[0].ip_id]
//   );

//   if (deleteData.rows[0].status == 0 || deleteData.rows[0].status == 2) {
//     res.status(200).json({ message: "Data deleted successfully." });
//   } else {
//     await DB.query(
//       `UPDATE tb_data_pribadi SET point_pendidikan = point_pendidikan - ${deleteData.rows[0].point} WHERE user_id = '${deleteData.rows[0].user_id}'`
//     );
//     res.status(200).json({ message: "Data deleted successfully." });
//   }
// });

exports.approveStatusIp = asyncHandler(async (req, res) => {
  const { ipId } = req.params;

  const findData = await DB.query("SELECT * FROM tb_ip_mhs WHERE ip_id = $1", [
    ipId,
  ]);

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_ip_mhs SET status = $1, updated_at = $2 WHERE ip_id = $3 returning *`,
      [1, convert, ipId]
    );

    const data = await DB.query(
      "SELECT * FROM tb_ip_mhs WHERE user_id = $1 and status = $2",
      [updateStatus.rows[0].user_id, 1]
    );

    const userId = data.rows[0].user_id;

    const sumPoint = await DB.query(
      "SELECT SUM(point) AS total_points FROM tb_ip_mhs WHERE user_id = $1 and status = $2 and is_deleted = $3",
      [userId, 1, false]
    );

    const totalPoints = sumPoint.rows[0].total_points;

    await DB.query(
      "UPDATE tb_data_pribadi SET point_pendidikan = $1 WHERE user_id = $2",
      [totalPoints, userId]
    );

    res.status(201).json({
      message: "Successfully update data.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusIp = asyncHandler(async (req, res) => {
  const { ipId } = req.params;

  const findData = await DB.query("SELECT * FROM tb_ip_mhs WHERE ip_id = $1", [
    ipId,
  ]);

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_ip_mhs SET status = $1, updated_at = $2 WHERE ip_id = $3 returning *`,
      [2, convert, ipId]
    );

    res.status(201).json({
      message: "Successfully update data.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataIp = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const semester = data.semester || null;
  const ip = data.ip || null;
  const tahun = data.tahun || null;

  const findData = await DB.query(
    `SELECT * FROM filter_data_ip($1, $2, $3, $4)`,
    [semester, ip, tahun, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
