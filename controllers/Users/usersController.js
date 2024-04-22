const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const bcrypt = require("bcryptjs");
const {
  changePasswordUsersValidation,
} = require("../../validation/formValidation");
const { GamifyPoints } = require("../../utils/gamify");
const { getMkForMhs } = require("../../helper/skpi");

exports.getUserMhs = asyncHandler(async (req, res) => {
  const { page, limit, searchQuery, nama_lengkap, npm, nidn, kode_mhs } =
    req.query;

  if (nama_lengkap || npm || nidn || kode_mhs) {
    const dataName = nama_lengkap || "";
    const dataNpm = npm || "";
    const dataNidn = nidn || "";
    const dataKodeMhs = kode_mhs || "";

    const pageNumber = page || 1;
    const itemsPerPage = limit || 10;
    const offset = (pageNumber - 1) * itemsPerPage;

    const findData = await DB.query(
      `SELECT * FROM filter_users($1, $2, $3, $4, $5, $6, $7) AS result`,
      [dataName, dataNpm, dataNidn, dataKodeMhs, null, itemsPerPage, offset]
    );

    const totalDataQuery = await DB.query(
      `SELECT COUNT(*) FROM filter_users($1, $2, $3, $4, $5, $6, $7) AS count`,
      [dataName, dataNpm, dataNidn, dataKodeMhs, null, null, null]
    );

    const totalData = totalDataQuery.rows[0].count;

    const updatedUsers = findData.rows.map(async (iterate) => {
      const matkulMhs = await getMkForMhs(iterate.npm);
      const status_frs =
        iterate.kode_mhs === "ACTIVE"
          ? !matkulMhs.Data && !matkulMhs.Total && !matkulMhs.SKS
            ? 0
            : 1
          : null;
      return { ...iterate, status_frs };
    });

    const updatedUsersWithData = await Promise.all(updatedUsers);

    return res.status(201).json({
      data: updatedUsersWithData,
      totalData: totalData,
    });
  } else {
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

    const countQuery = `
      SELECT COUNT(*) FROM tb_users
      JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id
      WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true
      ${searchFilter}
    `;

    const totalCount = await DB.query(countQuery, searchParams);
    const totalData = totalCount.rows[0].count;

    const dataQuery = `
    SELECT tb_users.*, tb_data_pribadi.*, (SELECT COUNT(*) FROM tb_sertifikasi WHERE tb_sertifikasi.user_id = tb_users.user_id AND tb_sertifikasi.is_deleted = false AND tb_sertifikasi.status = 1) AS total_sertifikasi  FROM tb_users
    JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id
    WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true
    ${searchFilter}
    ORDER BY tb_users.created_at DESC
    LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
  `;

    const user = await DB.query(dataQuery, [
      ...searchParams,
      itemsPerPage,
      offset,
    ]);

    const updatedUsers = user.rows.map(async (iterate) => {
      const matkulMhs = await getMkForMhs(iterate.npm);
      const status_frs =
        iterate.kode_mhs === "ACTIVE"
          ? !matkulMhs.Data && !matkulMhs.Total && !matkulMhs.SKS
            ? 0
            : 1
          : null;
      return { ...iterate, status_frs };
    });

    const updatedUsersWithData = await Promise.all(updatedUsers);

    return res.status(200).json({
      message: "Success get data.",
      data: updatedUsersWithData,
      totalData: totalData,
    });
  }
});

exports.getTotalUsers = asyncHandler(async (req, res) => {
  const resultMhs = await DB.query(
    `SELECT COUNT(*) AS total_data FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true`
  );

  const resultDosen = await DB.query(
    `SELECT COUNT(*) AS total_data FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id WHERE tb_users.role = 'Dosen' AND tb_users.isverified = true`
  );

  const totalMhs = resultMhs.rows[0].total_data;
  const totalDosen = resultDosen.rows[0].total_data;

  res.status(200).json({
    total_mahasiswa: totalMhs,
    total_dosen: totalDosen,
  });
});

exports.getUserDosen = asyncHandler(async (req, res) => {
  const { page, limit, searchQuery, nama_lengkap, npm, nidn, kode_mhs } =
    req.query;

  if (nama_lengkap || npm || nidn || kode_mhs) {
    const dataName = nama_lengkap || null;
    const dataNpm = npm || null;
    const dataNidn = nidn || null;
    const dataKodeMhs = kode_mhs || null;

    const pageNumber = page || 1;
    const itemsPerPage = limit || 10;
    const offset = (pageNumber - 1) * itemsPerPage;

    const findData = await DB.query(
      `SELECT * FROM filter_users($1, $2, $3, $4, $5, $6, $7) AS result`,
      [dataName, dataNpm, null, dataKodeMhs, dataNidn, itemsPerPage, offset]
    );

    const totalDataQuery = await DB.query(
      `SELECT COUNT(*) FROM filter_users($1, $2, $3, $4, $5, $6, $7) AS count`,
      [dataName, dataNpm, null, dataKodeMhs, dataNidn, null, null]
    );

    const totalData = totalDataQuery.rows[0].count;

    res.status(201).json({
      data: findData.rows,
      totalData: totalData,
    });
  } else {
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

    const countQuery = `
      SELECT COUNT(*) FROM tb_users
      JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id
      WHERE tb_users.role = 'Dosen' AND tb_users.isverified = true
      ${searchFilter}
    `;

    const totalCount = await DB.query(countQuery, searchParams);
    const totalData = totalCount.rows[0].count;

    const query = `
      SELECT tb_users.*, tb_data_pribadi.no_hp, tb_data_pribadi.nama_lengkap, tb_jabatan_dosen.jabatan_id, tb_data_pribadi.kode_mhs, tb_jabatan_dosen.jabatan_fungsi, tb_data_pribadi.nip
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
      ORDER BY tb_users.created_at DESC
      LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
    `;

    // Menjalankan query dengan parameter
    const user = await DB.query(query, [...searchParams, itemsPerPage, offset]);

    res.status(200).json({
      message: "Success get data.",
      data: user.rows,
      totalData: totalData,
    });
  }
});

exports.detailUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // const getTotalPoint = await DB.query(
  //   "SELECT point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi AS total_points FROM tb_data_pribadi WHERE user_id = $1",
  //   [userId]
  // );

  // const total_points = getTotalPoint.rows[0].total_points;

  // await DB.query(
  //   "UPDATE tb_data_pribadi SET total_point = $1 WHERE user_id = $2",
  //   [total_points, userId]
  // );

  const findData = await DB.query(
    "SELECT tb_users.*, tb_data_pribadi.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id WHERE tb_users.user_id = $1",
    [userId]
  );

  const dataRekomendasi = await DB.query(
    "SELECT rekomendasi_mhs.body as text_rekomendasi, rekomendasi_mhs.created_at, tb_data_pribadi.nama_lengkap as nama_dosen, tb_data_pribadi.image,tb_users.nidn FROM rekomendasi_mhs LEFT JOIN tb_data_pribadi ON rekomendasi_mhs.user_id = tb_data_pribadi.user_id LEFT JOIN tb_users ON rekomendasi_mhs.user_id = tb_users.user_id WHERE mahasiswa_id = $1 ORDER BY rekomendasi_mhs.created_at DESC",
    [userId]
  );

  const sertifikasiData = await DB.query(
    "SELECT * FROM tb_sertifikasi WHERE user_id = $1  and is_deleted = $2",
    [userId, false]
  );

  const jumlahDataSertifikasi = await DB.query(
    "SELECT COUNT(*) FROM tb_sertifikasi WHERE user_id = $1  and is_deleted = $2",
    [userId, false]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
    rekomendasiMhs: dataRekomendasi.rows,
    dataSertifikasi: sertifikasiData.rows,
    totalDataSertifikasi: jumlahDataSertifikasi.rows[0].count,
  });
});

exports.changePaswordUser = asyncHandler(async (req, res) => {
  const { error } = changePasswordUsersValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { userId } = req.params;
  const { password } = req.body;

  const findUser = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userId,
  ]);

  if (findUser.rows.length) {
    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await DB.query("UPDATE tb_users SET password = $1 WHERE user_id = $2", [
      hashedPassword,
      userId,
    ]);

    return res.status(200).json({ message: "Password change successfull." });
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

exports.changeEmail = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { email } = req.body;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userId,
  ]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  const findEmail = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
    email,
  ]);

  if (findEmail.rows.length) {
    res.status(404);
    throw new Error("email sudah terdaftar.");
  }

  const updateUser = await DB.query(
    `UPDATE tb_users SET email = $1 WHERE user_id = $2 returning *`,
    [email, userId]
  );

  res.status(200).json({
    message: "Success Update Data",
    data: updateUser.rows[0],
  });
});

exports.papanPeringkat = asyncHandler(async (req, res) => {
  const { page, limit, searchQuery, nama_lengkap, npm } = req.query;

  if (nama_lengkap || npm) {
    const dataName = nama_lengkap || null;
    const dataNpm = npm || null;
    // const dataNidn = nidn || null;
    // const dataKodeMhs = kode_mhs || null;

    const pageNumber = page || 1;
    const itemsPerPage = limit || 10;
    const offset = (pageNumber - 1) * itemsPerPage;

    const findData = await DB.query(
      `SELECT * FROM filter_users($1, $2, $3, $4, $5, $6, $7) AS result`,
      [dataName, dataNpm, null, null, null, itemsPerPage, offset]
    );

    const totalDataQuery = await DB.query(
      `SELECT COUNT(*) FROM filter_users($1, $2, $3, $4, $5, $6, $7) AS count`,
      [dataName, dataNpm, null, null, null, null, null]
    );

    const totalData = totalDataQuery.rows[0].count;

    res.status(201).json({
      data: findData.rows,
      totalData: totalData,
    });

    // const dataName = nama_lengkap || null;
    // const dataNpm = npm || null;

    // const findData = await DB.query(
    //   `SELECT * FROM filter_users($1, $2, $3, $4, $5)`,
    //   [dataName, dataNpm, null, null, null]
    // );

    // res.status(201).json({
    //   data: findData.rows,
    // });
  } else {
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

    const countQuery = `
      SELECT COUNT(*) FROM tb_users
      JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id
      WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true
      ${searchFilter}
    `;

    const totalCount = await DB.query(countQuery, searchParams);
    const totalData = totalCount.rows[0].count;

    const dataQuery = `
    SELECT tb_users.*, tb_data_pribadi.*, 
      (SELECT COUNT(*) FROM tb_sertifikasi WHERE tb_sertifikasi.user_id = tb_users.user_id AND tb_sertifikasi.is_deleted = false AND tb_sertifikasi.status = 1) AS total_sertifikasi 
    FROM tb_users
    JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id
    WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true AND tb_data_pribadi.kode_mhs = 'ACTIVE'
    ${searchFilter}
    ORDER BY tb_data_pribadi.total_point DESC
    LIMIT $1 OFFSET $2
  `;

    const user = await DB.query(dataQuery, [
      ...searchParams,
      itemsPerPage,
      offset,
    ]);

    res.status(200).json({
      message: "Success get data.",
      data: user.rows,
      totalData: totalData,
    });
  }
});

exports.getUsesDsnMhs = asyncHandler(async (req, res) => {
  const findMhs = await DB.query(
    "SELECT tb_users.user_id, tb_users.npm, tb_data_pribadi.nama_lengkap FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true "
  );

  const resultsMhs = findMhs.rows;

  const findDosen = await DB.query(
    "SELECT tb_users.user_id, tb_users.nidn, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.role = 'Dosen' AND tb_users.isverified = true "
  );

  const resultsDosen = findDosen.rows;

  res.status(200).json({
    message: "Success get data.",
    data: {
      resultsMhs,
      resultsDosen,
    },
  });
});
exports.getUserMhsAgain = asyncHandler(async (req, res) => {
  const findMhs = await DB.query(
    "SELECT tb_users.user_id, tb_users.npm, tb_data_pribadi.nama_lengkap, tb_data_pribadi.image FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true "
  );

  const resultsMhs = findMhs.rows;

  res.status(200).json({
    message: "Success get data.",
    data: resultsMhs,
  });
});
exports.getUserDosenAgain = asyncHandler(async (req, res) => {
  const findDosen = await DB.query(
    "SELECT tb_users.user_id, tb_users.nidn, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.image FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.role = 'Dosen' AND tb_users.isverified = true "
  );

  const resultsDosen = findDosen.rows;

  res.status(200).json({
    message: "Success get data.",
    data: resultsDosen,
  });
});
exports.getUsers = asyncHandler(async (req, res) => {
  const findUsers = await DB.query(
    "SELECT tb_users.user_id, tb_users.npm, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.image FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.isverified = true "
  );

  const resultsUsers = findUsers.rows;

  res.status(200).json({
    message: "Success get data.",
    data: resultsUsers,
  });
});

exports.getUsersForNotaDinas = asyncHandler(async (req, res) => {
  const findUsers = await DB.query(
    "SELECT tb_users.user_id, tb_users.npm, tb_data_pribadi.nama_lengkap, tb_data_pribadi.image, ta_pengajuan_sk.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id  JOIN ta_pengajuan_sk ON tb_users.user_id = ta_pengajuan_sk.mhs_id WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true"
  );

  const resultsUsers = findUsers.rows;

  res.status(200).json({
    message: "Success get data.",
    data: resultsUsers,
  });
});
