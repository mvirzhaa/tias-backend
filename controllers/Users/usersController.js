const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const bcrypt = require("bcryptjs");
const {
  changePasswordUsersValidation,
} = require("../../validation/formValidation");
const mysql = require("mysql2");
const {
  getMatkulByNpm,
  getDosen,
  getPegawai,
} = require("../../helper/informatics");
const User = require("../../models/User");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { Sequelize, Op } = require("sequelize");
const DataPribadi = require("../../models/DataPribadi");
const {
  getDataImportUsers,
  getDataImportUsersAgain,
  getDataImporPegawai,
} = require("../../helper/general");

const pool = mysql.createPool({
  host: process.env.SIAK_DB_HOST,
  user: process.env.SIAK_DB_USERNAME,
  password: process.env.SIAK_DB_PASSWORD,
  database: process.env.SIAK_DB_DATABASE,
});

function executeQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results, fields) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

exports.importDataDosen = asyncHandler(async (req, res) => {
  let { file } = req.body;
  const dataExcel = await getDataImportUsers(file[0].filepath);

  // Filter out NIPs that start with '41' and ensure valid NIP/NIDN
  const filteredData = dataExcel.filter(
    (data) => data.nip && !data.nip.startsWith("41")
  );

  const resultsDosen = await getDosen();

  // Find existing users based on NIDN or email
  const existingUsers = await User.findAll({
    where: {
      [Sequelize.Op.or]: [
        { nidn: filteredData.map((data) => data.nidn) },
        { email: filteredData.map((data) => data.email) },
      ],
    },
    attributes: ["nidn", "email"],
  });

  // Extract existing NIDNs and emails into sets for fast lookup
  const existingNidns = new Set(existingUsers.map((user) => user.nidn));
  const existingEmails = new Set(existingUsers.map((user) => user.email));

  // Find existing personal data based on NIP
  const existingPersonalData = await DataPribadi.findAll({
    where: {
      nip: filteredData.map((data) => data.nip),
    },
    attributes: ["nip"],
  });

  // Extract existing NIPs into a set for fast lookup
  const existingNips = new Set(existingPersonalData.map((data) => data.nip));

  // Map filtered data to usersData, checking for duplicates
  const usersData = filteredData
    .map((data) => {
      const dosenWithNidn = resultsDosen.find(
        (dosen) => dosen.nidn === data.nidn || dosen.nip === data.nip
      );

      if (
        dosenWithNidn &&
        !existingNidns.has(data.nidn) &&
        !existingEmails.has(data.email)
      ) {
        return {
          nidn: data.nidn,
          email: data.email,
          password: data.hashedPassword, // Password sudah ter-hash
          role: process.env.ROLE_ID_DOSEN,
          curr_code: "",
          created_at: new Date(),
          department_code: dosenWithNidn.lookup_id,
          isverified: true,
        };
      }
    })
    .filter(Boolean); // Remove undefined values

  // Log usersData for debugging

  // Check if there's any data to insert
  if (usersData.length === 0) {
    return res.status(200).json({
      message:
        "No valid data to insert (either all data already exists or invalid).",
    });
  }

  try {
    // Insert users in bulk
    const createdUsers = await User.bulkCreate(usersData, { returning: true });

    // Map the created users to personalData, ensuring unique NIPs
    const personalData = createdUsers
      .map((user) => {
        const dosenWithNidn = resultsDosen.find(
          (dosen) => dosen.nidn === user.nidn
        );
        const jenkelSiak =
          dosenWithNidn.jenis_kelamin === "LAKI-LAKI" ? "L" : "P";
        const statusKawin = dosenWithNidn.status_sipil === "MENIKAH" ? 1 : 0;

        if (!existingNips.has(dosenWithNidn.nip)) {
          return {
            user_id: user.user_id, // Using created user_id from bulkCreate
            nama_lengkap: `${dosenWithNidn.gelar_depan} ${dosenWithNidn.nama} ${dosenWithNidn.gelar_belakang}`,
            jenkel: jenkelSiak,
            tanggal_lahir: dosenWithNidn.tanggal_lahir,
            tempat_lahir: dosenWithNidn.tempat_lahir,
            ibu_kandung: dosenWithNidn.nama_ibu_kandung,
            agama: dosenWithNidn.agama,
            email: user.email,
            alamat: dosenWithNidn.alamat,
            kota_kabupaten: dosenWithNidn.kota,
            no_hp: dosenWithNidn.no_handphone,
            provinsi: dosenWithNidn.propinsi,
            kode_pos: dosenWithNidn.kodepos,
            status_kawin: statusKawin,
            nik: dosenWithNidn.no_ktp,
            created_at: new Date(),
            kode_mhs: dosenWithNidn.klasi_pegawai,
            nip: dosenWithNidn.nip,
            instansi_ext: "0",
          };
        }
      })
      .filter(Boolean); // Remove undefined values

    // Insert personal data in bulk
    if (personalData.length > 0) {
      await DataPribadi.bulkCreate(personalData);
    }

    res.status(200).json({
      message: "Data successfully processed and inserted.",
      users: createdUsers,
    });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map((err) => ({
          message: err.message,
          field: err.path,
          value: err.value,
        })),
      });
    }

    console.error("Unexpected error:", error);
    return res.status(500).json({
      message: "Unexpected error occurred",
      error: error.message,
    });
  }
});

exports.importDataDosenAgain = asyncHandler(async (req, res) => {
  let { file } = req.body;
  const dataExcel = await getDataImportUsersAgain(file[0].filepath);

  const filteredData = dataExcel.filter(
    (data) => data.nip && !data.nip.startsWith("41")
  );

  const existingUsers = await User.findAll({
    where: {
      [Sequelize.Op.or]: [
        { nidn: filteredData.map((data) => data.nidn) },
        { email: filteredData.map((data) => data.email) },
      ],
    },
    attributes: ["nidn", "email"],
  });

  const existingNidns = new Set(existingUsers.map((user) => user.nidn));
  const existingEmails = new Set(existingUsers.map((user) => user.email));

  const existingPersonalData = await DataPribadi.findAll({
    where: {
      nip: filteredData.map((data) => data.nip),
    },
    attributes: ["nip"],
  });

  const existingNips = new Set(existingPersonalData.map((data) => data.nip));

  const usersData = filteredData
    .map((data) => {
      if (!existingNidns.has(data.nidn) && !existingEmails.has(data.email)) {
        return {
          nidn: data.nidn,
          email: data.email,
          password: data.hashedPassword,
          role: process.env.ROLE_ID_DOSEN,
          curr_code: "",
          created_at: new Date(),
          department_code: "-",
          isverified: true,
        };
      }
    })
    .filter(Boolean);

  if (usersData.length === 0) {
    return res.status(200).json({
      message:
        "No valid data to insert (either all data already exists or invalid).",
    });
  }

  try {
    const createdUsers = await User.bulkCreate(usersData, { returning: true });

    const personalData = createdUsers
      .map((user) => {
        const dosenData = filteredData.find((data) => data.nidn === user.nidn);

        if (!existingNips.has(dosenData.nip)) {
          return {
            user_id: user.user_id, // Using created user_id from bulkCreate
            nama_lengkap: dosenData.nama_lengkap,
            jenkel: dosenData.jenis_kelamin,
            tempat_lahir: dosenData.tempat_lahir,
            agama: dosenData.agama,
            email: user.email,
            alamat: dosenData.alamat,
            no_hp: dosenData.no_hp,
            nik: dosenData.nik || "0000000000000000",
            created_at: new Date(),
            kode_mhs: dosenData.kode_mhs || "PENDIDIK (DOSEN)",
            nip: dosenData.nip,
            instansi_ext: "0",
          };
        }
      })
      .filter(Boolean);

    if (personalData.length > 0) {
      await DataPribadi.bulkCreate(personalData);
    }

    res.status(200).json({
      message: "Data successfully processed and inserted.",
      users: createdUsers,
    });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map((err) => ({
          message: err.message,
          field: err.path,
          value: err.value,
        })),
      });
    }

    console.error("Unexpected error:", error);
    return res.status(500).json({
      message: "Unexpected error occurred",
      error: error.message,
    });
  }
});

exports.importDataPegawai = asyncHandler(async (req, res) => {
  try {
    const { file } = req.body;

    const dataExcel = await getDataImporPegawai(file[0].filepath);

    let dummyCounter = 1;

    dataExcel.forEach((data, index) => {
      if (
        !data.email ||
        typeof data.email !== "string" ||
        data.email.trim() === ""
      ) {
        data.email = `example${dummyCounter}@gmail.com`;
        dummyCounter++;
      }
    });

    const allEmails = dataExcel.map((data) => data.email);

    const existingUsers = await User.findAll({
      where: {
        email: { [Op.in]: allEmails },
      },
      attributes: ["email"],
    });

    const existingEmails = new Set(existingUsers.map((user) => user.email));

    const filteredData = dataExcel.filter(
      (data) => data.email && !existingEmails.has(data.email)
    );

    const usersData = filteredData.map((data) => ({
      email: data.email,
      password: data.hashedPassword,
      role: process.env.ROLE_ID_PEGAWAI,
      curr_code: "",
      created_at: new Date(),
      department_code: data.unit,
      isverified: true,
      nip: data.nip,
    }));

    if (usersData.length === 0) {
      return res.status(200).json({
        message: "Semua data sudah ada di database.",
      });
    }

    const createdUsers = await User.bulkCreate(usersData, { returning: true });

    console.log("Jumlah user berhasil dibuat:", createdUsers.length);

    const personalData = createdUsers.map((user) => {
      const originalData = filteredData.find((d) => d.email === user.email);
      return {
        user_id: user.user_id,
        nama_lengkap: originalData?.nama_lengkap || "",
        tempat_lahir: originalData?.tempat_lahir || "",
        email: user.email,
        nip: originalData?.nip,
        instansi_ext: "0",
      };
    });

    await DataPribadi.bulkCreate(personalData);

    return res.status(200).json({
      message: "Data berhasil dimasukkan.",
      users: createdUsers,
    });
  } catch (error) {
    console.error("Error in importDataPegawai:", error);
    return res.status(500).json({
      message: "Gagal memproses data.",
      error: error.message,
    });
  }
});

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
      const matkulMhs = await getMatkulByNpm(iterate.npm);
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
      const matkulMhs = await getMatkulByNpm(iterate.npm);
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

exports.getUserDosenExt = asyncHandler(async (req, res) => {
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
      [dataName, null, null, null, null, itemsPerPage, offset]
    );

    const totalDataQuery = await DB.query(
      `SELECT COUNT(*) FROM filter_users($1, $2, $3, $4, $5, $6, $7) AS count`,
      [dataName, null, null, null, null, null, null]
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
      WHERE tb_users.role = 'Dosen_Ext'
      ${searchFilter}
    `;

    const totalCount = await DB.query(countQuery, searchParams);
    const totalData = totalCount.rows[0].count;

    const query = `
      SELECT tb_users.*, tb_data_pribadi.no_hp, tb_data_pribadi.nama_lengkap, tb_jabatan_dosen.jabatan_id, tb_data_pribadi.kode_mhs, tb_jabatan_dosen.jabatan_fungsi, tb_data_pribadi.nip, tb_data_pribadi.instansi_ext
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
      WHERE tb_users.role = 'Dosen_Ext'
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

exports.getMhsBeasiswa = asyncHandler(async (req, res) => {
  const { dataTable, orderField, orderValue, page, perPage, search } =
    req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;
  const offset = (pageNumber - 1) * itemsPerPage;

  let baseQuery = `
    FROM siak_student
    WHERE funding_scheme != 'MANDIRI'
  `;

  if (search) {
    baseQuery += ` AND LOWER(name) LIKE '%${search.toLowerCase()}%'`;
  }

  let query = `SELECT * ${baseQuery}`;

  if (orderField && orderValue) {
    if (typeof orderField === "string" && typeof orderValue === "string") {
      query += ` ORDER BY ${orderField} ${orderValue}`;
    } else {
      res
        .status(400)
        .json({ message: "orderField and orderValue must be strings." });
      return;
    }
  }

  query += ` LIMIT ${itemsPerPage} OFFSET ${offset}`;

  try {
    const result = await executeQuery(query);

    let responseData = result;

    const totalRecordsQuery = `SELECT COUNT(*) AS total ${baseQuery}`;
    const [totalRecordsResult] = await executeQuery(totalRecordsQuery);
    const totalRecords = totalRecordsResult.total;

    if (dataTable === "true") {
      responseData = {
        message: "success",
        draw: 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: responseData,
      };
    } else {
      responseData = {
        message: "success",
        data: responseData,
      };
    }

    res.status(200).json(responseData);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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

exports.getUsersForNotaDinas = asyncHandler(async (req, res) => {
  const findUsers = await DB.query(
    "SELECT tb_users.user_id, tb_users.npm, tb_data_pribadi.nama_lengkap, tb_data_pribadi.image, ta_pengajuan_sk.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id  JOIN ta_pengajuan_sk ON tb_users.user_id = ta_pengajuan_sk.mhs_id WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true AND ta_pengajuan_sk.status != 'selesai' AND ta_pengajuan_sk.nomor_nota_dinas IS NULL AND ta_pengajuan_sk.deleted_at IS NULL"
  );

  const resultsUsers = findUsers.rows;

  res.status(200).json({
    message: "Success get data.",
    data: resultsUsers,
  });
});

// exports.getUsers = async (req, res) => {
//   try {
//     let { limit, page, order, orderBy, search, filter, filterValue } =
//       req.query;
//     limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
//     page = page ? parseInt(page) : 1;
//     order = order ? order : "user_id";
//     orderBy = orderBy ? orderBy : "DESC";
//     const pagelimit = getPagination(limit, page);

//     let whereCondition = {};

//     if (filter && filterValue) {
//       const filters = Array.isArray(filter) ? filter : [filter];
//       const filterValues = Array.isArray(filterValue)
//         ? filterValue
//         : [filterValue];

//       filters.forEach((f, index) => {
//         if (f && filterValues[index] !== undefined) {
//           whereCondition[f] = filterValues[index];
//         }
//       });
//     }

//     let condition = {
//       [Op.and]: whereCondition,
//     };

//     if (search) {
//       condition = {
//         ...condition,
//         [Op.or]: {
//           npm: {
//             [Op.like]: `%${search}%`,
//           },
//           nidn: {
//             [Op.like]: `%${search}%`,
//           },
//         },
//       };
//     }

//     const data = await User.findAndCountAll({
//       distinct: true,
//       where: condition,
//       order: [[order, orderBy]],
//       limit: pagelimit.limit,
//       offset: pagelimit.offset,
//       include: [
//         {
//           model: DataPribadi,
//           as: "personal_data",
//           required: true,
//         },
//       ],
//     });

//     return response(res, true, "success", {
//       limit,
//       page,
//       total: data.count,
//       total_page: Math.ceil(parseInt(data.count) / limit),
//       rows: data.rows,
//     });
//   } catch (error) {
//     return response(res, false, error.message, error);
//   }
// };

exports.getUsers = asyncHandler(async (req, res) => {
  try {
    const data = await User.findAll({
      include: [
        {
          model: DataPribadi,
          as: "personal_data",
          required: true,
        },
      ],
    });
    res.status(200).json({
      message: "Success get data.",
      data: data,
    });
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.listDosen = asyncHandler(async (req, res) => {
  const findDosen = await DB.query(
    "SELECT tb_users.user_id, tb_users.nidn, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.image, tb_data_pribadi.ttd FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE (tb_users.role = 'Dosen' OR tb_users.role = 'Dosen_Ext' OR tb_users.role = 'Pegawai')  AND tb_users.isverified = true "
  );

  const resultsDosen = findDosen.rows;

  res.status(200).json({
    message: "Success get data.",
    data: resultsDosen,
  });
});

exports.listDosenExt = asyncHandler(async (req, res) => {
  const findDosen = await DB.query(
    "SELECT tb_users.user_id, tb_users.nidn, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.image, tb_data_pribadi.ttd FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE  tb_users.role = 'Dosen_Ext'  AND tb_users.isverified = true "
  );

  const resultsDosen = findDosen.rows;

  res.status(200).json({
    message: "Success get data.",
    data: resultsDosen,
  });
});

exports.getPegawai = asyncHandler(async (req, res) => {
  try {
    let { limit, page, order, orderBy, search, filter, filterValue } =
      req.query;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    page = page ? parseInt(page) : 1;
    order = order ? order : "created_at";
    orderBy = orderBy ? orderBy : "DESC";
    const pagelimit = getPagination(limit, page);

    let whereCondition = {
      role: process.env.ROLE_ID_PEGAWAI,
    };

    if (filter && filterValue) {
      const filters = Array.isArray(filter) ? filter : [filter];
      const filterValues = Array.isArray(filterValue)
        ? filterValue
        : [filterValue];

      filters.forEach((f, index) => {
        if (f && filterValues[index] !== undefined) {
          whereCondition[f] = filterValues[index];
        }
      });
    }

    let condition = {
      [Op.and]: whereCondition,
    };

    if (search) {
      condition = {
        ...condition,
        [Op.or]: [
          { "$personal_data.nama_lengkap$": { [Op.like]: `%${search}%` } },
          { "$personal_data.nip$": { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const data = await User.findAndCountAll({
      distinct: true,
      where: condition,
      order: [[order, orderBy]],
      limit: pagelimit.limit,
      offset: pagelimit.offset,
      include: {
        model: DataPribadi,
        as: "personal_data",
      },
    });

    return response(res, true, "success", {
      limit,
      page,
      total: data.count,
      total_page: Math.ceil(parseInt(data.count) / limit),
      rows: data.rows,
    });
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.getUsersAndGroup = asyncHandler(async (req, res) => {
  try {
    const findData = await DB.query(
      "SELECT tb_users.user_id, tb_users.npm, tb_data_pribadi.nama_lengkap, tb_data_pribadi.image FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id"
    );
    const findGroup = await DB.query("SELECT * FROM tb_group");
    const findJabatan = await DB.query("SELECT * FROM m_jabatan");
    const findUnit = await DB.query("SELECT * FROM m_unit");

    const resultUsers = findData.rows.map((data) => ({
      ...data,
      type: "users",
    }));

    const resultGroup = findGroup.rows.map((data) => ({
      ...data,
      type: "group",
    }));

    const resultsJabatan = findJabatan.rows.map((data) => ({
      ...data,
      type: "jabatan",
    }));

    const resultsUnit = findUnit.rows.map((data) => ({
      ...data,
      type: "unit",
    }));

    const resultsData = [
      ...resultUsers,
      ...resultGroup,
      ...resultsJabatan,
      ...resultsUnit,
    ];

    res.status(200).json({
      message: "Success get data.",
      data: resultsData,
    });
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.getListUsers = asyncHandler(async (req, res) => {
  try {
    let { limit, page, order, orderBy, search, filter, filterValue } =
      req.query;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    page = page ? parseInt(page) : 1;
    order = order ? order : "created_at";
    orderBy = orderBy ? orderBy : "DESC";
    const pagelimit = getPagination(limit, page);

    let whereCondition = {};

    if (filter && filterValue) {
      const filters = Array.isArray(filter) ? filter : [filter];
      const filterValues = Array.isArray(filterValue)
        ? filterValue
        : [filterValue];

      filters.forEach((f, index) => {
        if (f && filterValues[index] !== undefined) {
          whereCondition[f] = filterValues[index];
        }
      });
    }

    let condition = {
      [Op.and]: whereCondition,
    };

    if (search) {
      condition = {
        ...condition,
        [Op.or]: [
          {
            nidn: {
              [Op.iLike]: `%${search}%`,
            },
          },
          {
            npm: {
              [Op.iLike]: `%${search}%`,
            },
          },
          {
            email: {
              [Op.iLike]: `%${search}%`,
            },
          },
          {
            "$personal_data.nama_lengkap$": {
              [Op.iLike]: `%${search.toUpperCase()}%`,
            },
          },
        ],
      };
    }

    const data = await User.findAndCountAll({
      distinct: true,
      where: condition,
      order: [[order, orderBy]],
      limit: pagelimit.limit,
      offset: pagelimit.offset,
      include: [
        {
          model: DataPribadi,
          as: "personal_data",
          required: true,
        },
      ],
    });

    return response(res, true, "success", {
      limit,
      page,
      total: data.count,
      total_page: Math.ceil(parseInt(data.count) / limit),
      rows: data.rows,
    });
  } catch (error) {
    return response(res, false, error.message, error);
  }
});
