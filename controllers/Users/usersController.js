const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const bcrypt = require("bcryptjs");
const { changePasswordUsersValidation } = require("../../validation/formValidation");
const { GamifyPoints } = require("../../utils/gamify");

exports.getUserMhs = asyncHandler(async (req, res) => {
  const { page, limit, searchQuery } = req.query;

  const pageNumber = page || 1;
  const itemsPerPage = limit || 10;
  const offset = (pageNumber - 1) * itemsPerPage;

  let searchFilter = "";
  let searchParams = [];

  if (searchQuery) {
    searchFilter = `AND tb_data_pribadi.nama_lengkap ILIKE $${
      searchParams.length + 1
    }`;
    searchParams = [...searchParams, `%${searchQuery}%`];
  }

  const query = `
    SELECT tb_users.*, tb_data_pribadi.no_hp, tb_data_pribadi.nama_lengkap, tb_data_pribadi.kode_mhs
    FROM tb_users
    JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id
    WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true
    ${searchFilter}
    LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
  `;

  const user = await DB.query(query, [...searchParams, itemsPerPage, offset]);

  res.status(200).json({
    message: "Success get data.",
    data: user.rows,
  });
});

exports.getTotalUsers = asyncHandler(async (req, res) => {
  const [resultMhs] = await connection.execute(`SELECT COUNT(*) AS total_data FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true`);

  const [resultDosen] = await connection.execute(`SELECT COUNT(*) AS total_data FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id WHERE tb_users.role = 'Dosen' AND tb_users.isverified = true`);

  const totalMhs = resultMhs[0].total_data;
  const totalDosen = resultDosen[0].total_data;

  res.status(200).json({
    total_mahasiswa: totalMhs,
    total_dosen: totalDosen,
  });
});

exports.getUserDosen = asyncHandler(async (req, res) => {
  const { page, limit, searchQuery } = req.query;

  // Pengaturan parameter paginasi
  const pageNumber = page || 1;
  const itemsPerPage = limit || 10;
  const offset = (pageNumber - 1) * itemsPerPage;

  let searchFilter = "";
  let searchParams = [];

  if (searchQuery) {
    searchFilter = `AND tb_data_pribadi.nama_lengkap ILIKE $${
      searchParams.length + 1
    }`;
    searchParams = [...searchParams, `%${searchQuery}%`];
  }

  const query = `
    SELECT tb_users.*, tb_data_pribadi.no_hp, tb_data_pribadi.nama_lengkap, tb_jabatan_dosen.jabatan_id, tb_data_pribadi.kode_mhs, tb_jabatan_dosen.jabatan_fungsi
    FROM tb_users
    JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id
    LEFT JOIN (
      SELECT user_id, jabatan_id, jabatan_fungsi
      FROM tb_jabatan_dosen
      WHERE (user_id, updated_at) IN (
        SELECT user_id, MAX(updated_at) AS max_updated_at
        FROM tb_jabatan_dosen
        GROUP BY user_id
      )
    ) AS tb_jabatan_dosen ON tb_users.user_id = tb_jabatan_dosen.user_id
    WHERE tb_users.role = 'Dosen'
    ${searchFilter}
    LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
  `;

  // Menjalankan query dengan parameter
  const user = await DB.query(query, [...searchParams, itemsPerPage, offset]);

  res.status(200).json({
    message: "Success get data.",
    data: user.rows,
  });
});

exports.detailUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const findUser = await DB.query('SELECT * FROM tb_users WHERE user_id = $1', [userId]);

  // if(findUser.rows[0].role === "Mahasiswa" && findUser.rows[0].npm !== null){
  //   const gamify = GamifyPoints(userId, findUser.rows[0].npm);

  //   if(gamify != 200){
  //     res.status(500);
  //     throw new Error("Gamification Error!.");
  //   }
  // }

  const getTotalPoint = await DB.query(
    "SELECT point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi AS total_points FROM tb_data_pribadi WHERE user_id = $1",
    [userId]
  );

  const total_points = getTotalPoint.rows[0].total_points;

  await DB.query(
    "UPDATE tb_data_pribadi SET total_point = $1 WHERE user_id = $2",
    [total_points, userId]
  );

  const findData = await DB.query(
    "SELECT tb_users.*, tb_data_pribadi.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id WHERE tb_users.user_id = $1",
    [userId]
  );

  const dataRekomendasi = await DB.query(
    "SELECT rekomendasi_mhs.body as text_rekomendasi, rekomendasi_mhs.created_at, tb_data_pribadi.nama_lengkap as nama_dosen, tb_data_pribadi.image,tb_users.nidn FROM rekomendasi_mhs LEFT JOIN tb_data_pribadi ON rekomendasi_mhs.user_id = tb_data_pribadi.user_id LEFT JOIN tb_users ON rekomendasi_mhs.user_id = tb_users.user_id WHERE mahasiswa_id = $1",
    [userId]
  );

  const sertifikasiData = await DB.query("SELECT * FROM tb_sertifikasi WHERE user_id = $1  and is_deleted = $2", [userId, false]);

  const jumlahDataSertifikasi = await DB.query(
    "SELECT COUNT(*) FROM tb_sertifikasi WHERE user_id = $1  and is_deleted = $2",
    [userId, false]
  );

  const ipAprove = await DB.query(
    "SELECT * FROM tb_ip_mhs WHERE user_id = $1 and status = $2 and is_deleted = $3",
    [userId, 1, false]
  );

  const ipArr = ipAprove.rows.map((row) => row.ip);
  const totalIp = ipArr.reduce((total, ip) => total + ip, 0);
  const jumlahSemester = ipArr.length;
  const ipk = totalIp / jumlahSemester;

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
    rekomendasiMhs: dataRekomendasi.rows,
    dataSertifikasi: sertifikasiData.rows,
    totalDataSertifikasi: jumlahDataSertifikasi.rows[0].count,
    ipk: ipk.toFixed(2),
  });
});

exports.changePaswordUser = asyncHandler(async (req, res) => {
  const { error } = changePasswordUsersValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const {userId} = req.params;
  const { password } = req.body;

  
  const findUser = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [userId]);

  if(findUser.rows.length){
      // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await DB.query("UPDATE tb_users SET password = $1 WHERE user_id = $2", [
      hashedPassword,
      userId,
    ]);

    return res
    .status(200)
    .json({ message: "Password change successfull." });
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});
