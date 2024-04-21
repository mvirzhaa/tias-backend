const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");

exports.pengajuanSk = asyncHandler(async (req, res) => {
  const data = req.body;
  const userLoginId = req.user.user_id;

  if (
    !data.judul_skripsi ||
    !data.lokasi_kegiatan ||
    !data.semester ||
    !data.sk_pembimbing_1 ||
    !data.sk_pembimbing_2 ||
    !data.kepala_lab
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  if (
    data.sk_pembimbing_1 === data.sk_pembimbing_2 ||
    data.sk_pembimbing_1 === data.sk_pembimbing_3 ||
    data.sk_pembimbing_2 === data.sk_pembimbing_3
  ) {
    res.status(400);
    throw new Error("invalid data.");
  }

  const keys = ["mhs_id", ...Object.keys(data), "status"];
  const values = [userLoginId, ...Object.values(data), "pengajuan-sk"];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  const saveData = await DB.query(
    `INSERT INTO ta_pengajuan_sk(${keys.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) returning *`,
    values
  );

  await DB.query(
    `INSERT INTO ta_pendaftaran_kolokium(mhs_id, pengajuan_sk_id) VALUES($1, $2)`,
    [userLoginId, saveData.rows[0].id]
  );

  await DB.query(
    `INSERT INTO ta_pendaftaran_sidang(mhs_id, pengajuan_sk_id) VALUES($1, $2)`,
    [userLoginId, saveData.rows[0].id]
  );

  await DB.query(
    `INSERT INTO ta_dokumen_final_skripsi(mhs_id, pengajuan_sk_id) VALUES($1, $2)`,
    [userLoginId, saveData.rows[0].id]
  );

  if (saveData.rows) {
    res.status(200).json({
      message: "Successfull created data.",
      data: saveData.rows[0],
    });
  } else {
    res.status(400);
    throw new Error("Invalid data.");
  }
});

exports.getByUserLogin = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const query = `
    SELECT 
      sk.id AS sk_id, 
      kolo.id AS kolo_id,
      sidang.id AS sidang_id,
      sk.*, 
      kolo.*,
      sidang.*
    FROM ta_pengajuan_sk AS sk
    LEFT JOIN ta_pendaftaran_kolokium AS kolo ON sk.id = kolo.pengajuan_sk_id
    LEFT JOIN ta_pendaftaran_sidang AS sidang ON sk.id = sidang.pengajuan_sk_id
    WHERE sk.mhs_id = $1
  `;

  const result = await DB.query(query, [userLoginId]);

  if (result.rows.length) {
    const koloIds = result.rows.map((row) => row.kolo_id);
    const sidangIds = result.rows.map((row) => row.sidang_id);

    const countQueryKolokium = `
      SELECT kolo_id, COUNT(*) AS count
      FROM ta_penilaian_kolokium
      WHERE kolo_id IN (${koloIds.join(",")})
      GROUP BY kolo_id
    `;
    const countResultKolokium = await DB.query(countQueryKolokium);

    const countQuerySidang = `
      SELECT sidang_id, COUNT(*) AS count
      FROM ta_penilaian_sidang
      WHERE sidang_id IN (${sidangIds.join(",")})
      GROUP BY sidang_id
    `;
    const countResultSidang = await DB.query(countQuerySidang);

    const penilaianMapKolokium = {};
    countResultKolokium.rows.forEach((row) => {
      penilaianMapKolokium[row.kolo_id] = row.count;
    });

    const penilaianMapSidang = {};
    countResultSidang.rows.forEach((row) => {
      penilaianMapSidang[row.sidang_id] = row.count;
    });

    const dataWithStatusPenilaian = result.rows.map((row) => {
      const koloId = row.kolo_id;
      const sidangId = row.sidang_id;

      const jumlahPenilaianKolokium = penilaianMapKolokium[koloId] || 0;
      const statusPenilaianKolokium =
        jumlahPenilaianKolokium >= 1 && jumlahPenilaianKolokium <= 5;

      const jumlahPenilaianSidang = penilaianMapSidang[sidangId] || 0;
      const statusPenilaianSidang =
        jumlahPenilaianSidang >= 1 && jumlahPenilaianSidang <= 5;

      return {
        ...row,
        status_penilaian: statusPenilaianKolokium,
        status_penilaian_sidang: statusPenilaianSidang,
      };
    });

    res.status(200).json({
      message: "success",
      data: dataWithStatusPenilaian,
      totalData: result.rowCount,
    });
  } else {
    res.status(200).json({
      message: "success",
      data: [],
      totalData: result.rowCount,
    });
  }
});

exports.getForAdmin = asyncHandler(async (req, res) => {
  const {
    filter,
    filterValue,
    dataTable,
    orderField,
    orderValue,
    page,
    perPage,
  } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;

  const offset = (pageNumber - 1) * itemsPerPage;

  let query =
    "SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_users.npm, ta_pendaftaran_kolokium.id AS kolo_id, ta_pendaftaran_sidang.id AS sidang_id FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id LEFT JOIN ta_pendaftaran_kolokium ON ta_pendaftaran_kolokium.pengajuan_sk_id = ta_pengajuan_sk.id LEFT JOIN ta_pendaftaran_sidang ON ta_pendaftaran_sidang.pengajuan_sk_id = ta_pengajuan_sk.id";

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        query += ` WHERE ${filter[i]} = '${filterValue[i]}'`;
        if (i !== filter.length - 1) {
          query += " AND";
        }
      }
    } else {
      res
        .status(400)
        .json({ message: "Filter and filterValue must be arrays." });
      return;
    }
  }

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

  const result = await DB.query(query);

  let responseData = [];
  let dataWithStatusPenilaian = [];
  let totalRecords = 0;

  if (result.rows.length > 0) {
    responseData = result.rows;

    const totalRecordsQuery = "SELECT COUNT(*) AS total FROM ta_pengajuan_sk";
    const totalRecordsResult = await DB.query(totalRecordsQuery);
    totalRecords = totalRecordsResult.rows[0].total;

    const koloIds = responseData.map((row) => row.kolo_id);
    const countQuery = `
      SELECT kolo_id, COUNT(*) AS count
      FROM ta_penilaian_kolokium
      WHERE kolo_id IN (${koloIds.join(",")})
      GROUP BY kolo_id
    `;
    const countResult = await DB.query(countQuery);

    const penilaianMap = {};
    countResult.rows.forEach((row) => {
      penilaianMap[row.kolo_id] = row.count;
    });

    const sidangIds = responseData.map((row) => row.sidang_id);
    const countQuerySidang = `
      SELECT sidang_id, COUNT(*) AS count
      FROM ta_penilaian_sidang
      WHERE sidang_id IN (${sidangIds.join(",")})
      GROUP BY sidang_id
    `;
    const countResultSidang = await DB.query(countQuerySidang);

    const penilaianSidangMap = {};
    countResultSidang.rows.forEach((row) => {
      penilaianSidangMap[row.sidang_id] = row.count;
    });

    dataWithStatusPenilaian = responseData.map((row) => {
      const koloId = row.kolo_id;
      const jumlahPenilaian = penilaianMap[koloId] || 0;
      const statusPenilaian = jumlahPenilaian >= 1 && jumlahPenilaian <= 5;

      const sidangId = row.sidang_id;
      const jumlahPenilaianSidang = penilaianSidangMap[sidangId] || 0;
      const statusPenilaianSidang =
        jumlahPenilaianSidang >= 1 && jumlahPenilaianSidang <= 5;

      return {
        ...row,
        status_penilaian: statusPenilaian,
        status_penilaian_sidang: statusPenilaianSidang,
      };
    });
  }

  if (dataTable === "true") {
    responseData = {
      message: "success",
      draw: 1,
      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,
      data: dataWithStatusPenilaian,
    };
  } else {
    responseData = {
      message: "success",
      data: dataWithStatusPenilaian,
    };
  }

  res.status(200).json(responseData);
});

exports.getForDosen = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const {
    filter,
    filterValue,
    dataTable,
    orderField,
    orderValue,
    page,
    perPage,
  } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;

  const offset = (pageNumber - 1) * itemsPerPage;

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
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' THEN 'SK Pembimbing 1 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' THEN 'SK Pembimbing 2 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' THEN 'SK Pembimbing 3 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' THEN 'Evaluator 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' THEN 'Evaluator 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' THEN 'Penguji 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.penguji_2 = '${userLoginId}' THEN 'Penguji 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Kolokium 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Kolokium 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Kolokium 3 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Sidang 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Sidang 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Sidang 3 | ' ELSE '' END
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
  ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR 
  ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR 
  ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR 
  ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR 
  ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR 
  ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR 
  ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR 
  ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR 
  ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_2 = '${userLoginId}'
`;

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        query += ` WHERE ${filter[i]} = '${filterValue[i]}'`;
        if (i !== filter.length - 1) {
          query += " AND";
        }
      }
    } else {
      res
        .status(400)
        .json({ message: "Filter and filterValue must be arrays." });
      return;
    }
  }

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

  const result = await DB.query(query);

  let responseData = [];
  let dataWithStatusPenilaian = [];
  let totalRecords = 0; // Define totalRecords here

  if (result.rows.length > 0) {
    responseData = result.rows;

    const totalRecordsQuery = "SELECT COUNT(*) AS total FROM ta_pengajuan_sk";
    const totalRecordsResult = await DB.query(totalRecordsQuery);
    totalRecords = totalRecordsResult.rows[0].total;

    const koloIds = responseData.map((row) => row.kolo_id);
    const sidangIds = responseData.map((row) => row.sidang_id);
    const countQueryKolokium = `
      SELECT kolo_id, dosen_id, COUNT(*) AS count
      FROM ta_penilaian_kolokium
      WHERE kolo_id IN (${koloIds.join(",")}) AND dosen_id = '${userLoginId}'
      GROUP BY kolo_id, dosen_id
    `;

    const countResultKolokium = await DB.query(countQueryKolokium);

    const penilaianMapKolokium = {};
    countResultKolokium.rows.forEach((row) => {
      penilaianMapKolokium[row.kolo_id] = row.count;
    });

    const countQuerySidang = `
      SELECT sidang_id, dosen_id, COUNT(*) AS count
      FROM ta_penilaian_sidang
      WHERE sidang_id IN (${sidangIds.join(
        ","
      )}) AND dosen_id = '${userLoginId}'
      GROUP BY sidang_id, dosen_id
    `;

    const countResultSidang = await DB.query(countQuerySidang);

    const penilaianMapSidang = {};
    countResultSidang.rows.forEach((row) => {
      penilaianMapSidang[row.sidang_id] = row.count;
    });

    dataWithStatusPenilaian = responseData.map((row) => {
      const koloId = row.kolo_id;
      const sidangId = row.sidang_id;

      const jumlahPenilaianKolokium = penilaianMapKolokium[koloId] || 0;
      const statusPenilaianKolokium =
        jumlahPenilaianKolokium >= 1 && jumlahPenilaianKolokium <= 5;

      const jumlahPenilaianSidang = penilaianMapSidang[sidangId] || 0;
      const statusPenilaianSidang =
        jumlahPenilaianSidang >= 1 && jumlahPenilaianSidang <= 5;

      return {
        ...row,
        status_penilaian: statusPenilaianKolokium,
        status_penilaian_sidang: statusPenilaianSidang,
      };
    });
  }

  if (dataTable === "true") {
    responseData = {
      message: "success",
      draw: 1,
      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,
      data: dataWithStatusPenilaian,
    };
  } else {
    responseData = {
      message: "success",
      data: dataWithStatusPenilaian,
    };
  }

  res.status(200).json(responseData);
});

exports.detailPengajuanSk = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const findData = await DB.query(query);

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.detailPengajuanSkForDosen = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userLoginId = req.user.user_id;

  let query = `SELECT ta_pengajuan_sk.*, 
  ta_pendaftaran_kolokium.kolo_pembimbing_1,
  ta_pendaftaran_kolokium.kolo_pembimbing_2,
  ta_pendaftaran_kolokium.kolo_pembimbing_3,
  ta_pendaftaran_kolokium.pengajuan_sk_id, 
  tb_data_pribadi.nama_lengkap, 
  tb_users.npm 
FROM ta_pengajuan_sk 
JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id 
JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id
JOIN ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id
WHERE (ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' 
       OR ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' 
       OR ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' 
       OR ta_pengajuan_sk.kepala_lab = '${userLoginId}'
       OR ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}'
       OR ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}'
       OR ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}') 
       AND ta_pengajuan_sk.id = ${id}`;

  const findData = await DB.query(query);

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  let statusDosen = 0;
  let isKepalaLab = false;

  if (findData.rows[0].sk_pembimbing_1 == userLoginId) {
    statusDosen = 1;
  } else if (findData.rows[0].sk_pembimbing_2 == userLoginId) {
    statusDosen = 2;
  } else if (findData.rows[0].sk_pembimbing_3 == userLoginId) {
    statusDosen = 3;
  }

  if (findData.rows[0].kepala_lab == userLoginId) {
    isKepalaLab = true;
  }

  res.status(201).json({
    data: {
      ...findData.rows[0],
      statusDosen: statusDosen,
      isKepalaLab: isKepalaLab,
    },
  });
});

exports.approvedStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { db, ...updateData } = req.body;

  const findData = await DB.query(`SELECT * FROM ${db} WHERE id = $1`, [id]);
  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  const setQuery = Object.keys(updateData)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(", ");

  const updateValues = Object.values(updateData);
  updateValues.unshift(id);

  const saveData = await DB.query(
    `UPDATE ${db} SET ${setQuery} WHERE id = $1 RETURNING *`,
    updateValues
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: saveData.rows[0],
  });
});

exports.updatePengajuanSk = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nomor_sk, tgl_sk, link_dokumen_sk } = req.body;

  if (!nomor_sk || !tgl_sk || !link_dokumen_sk) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const findData = await DB.query(
    "SELECT * FROM ta_pengajuan_sk WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  if (findData.rows[0].sk_pembimbing_1 && !findData.rows[0].sk_status_pem_1) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }
  if (findData.rows[0].sk_pembimbing_2 && !findData.rows[0].sk_status_pem_2) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }
  if (findData.rows[0].sk_pembimbing_3 && !findData.rows[0].sk_status_pem_3) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }
  if (!findData.rows[0].status_kepala_lab) {
    res.status(400);
    throw new Error("Status kepala lab belum acc.");
  }
  const status = "menuju-kolokium";
  const updateData = await DB.query(
    `UPDATE ta_pengajuan_sk 
     SET nomor_sk = $1, tgl_sk = $2, link_dokumen_sk = $3, status = $4, status_approved = $5
     WHERE id = $6`,
    [nomor_sk, tgl_sk, link_dokumen_sk, status, true, id]
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateData.rows[0],
  });
});

// PENGAJUAN KOLO
exports.getPengajuanKolokiumById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = req.user;

  const dataPengajuanKolo = await DB.query(
    `SELECT * FROM ta_pendaftaran_kolokium WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  if (user.role === "Dosen") {
    const userLoginId = user.user_id;
    let statusDosen = 0;
    if (dataPengajuanKolo.rows[0].kolo_pembimbing_1 == userLoginId) {
      statusDosen = 1;
    } else if (dataPengajuanKolo.rows[0].kolo_pembimbing_2 == userLoginId) {
      statusDosen = 2;
    } else if (dataPengajuanKolo.rows[0].kolo_pembimbing_3 == userLoginId) {
      statusDosen = 3;
    } else if (dataPengajuanKolo.rows[0].evaluator_1 == userLoginId) {
      statusDosen = "evaluator_1";
    } else if (dataPengajuanKolo.rows[0].evaluator_2 == userLoginId) {
      statusDosen = "evaluator_2";
    }

    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanKolo.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        kolo_id: dataPengajuanKolo.rows.length
          ? `${dataPengajuanKolo.rows[0].id}`
          : null,
        statusDosen: statusDosen,
      },
    });
  } else {
    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanKolo.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        kolo_id: dataPengajuanKolo.rows.length
          ? `${dataPengajuanKolo.rows[0].id}`
          : null,
      },
    });
  }
});

exports.pengajuanKolokium = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.file;
  const { id } = req.params;

  const requiredData = {
    link_dok_mhs_aktif: data.link_dok_mhs_aktif,
    link_dok_pembayaran: data.link_dok_pembayaran,
    kolo_pembimbing_1: data.kolo_pembimbing_1,
    kolo_pembimbing_2: data.kolo_pembimbing_2,
  };

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== ""
  );

  if (!requiredPropsExist) {
    console.log(file);
    // fs.unlink(file.path, (err) => {
    //   if (err) {
    //     console.log(err);
    //   }
    //   return;
    // });
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  if (!file) {
    res.status(400);
    throw new Error("Please fill one file.");
  }

  if (
    data.kolo_pembimbing_1 == data.kolo_pembimbing_2 ||
    data.kolo_pembimbing_1 == data.kolo_pembimbing_3 ||
    data.kolo_pembimbing_2 == data.kolo_pembimbing_3
  ) {
    res.status(400);
    throw new Error("Invalid data.");
  }

  const saveData = {
    file_makalah: file.filename,
    ...requiredData,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const insertedData = await DB.query(
    `UPDATE ta_pendaftaran_kolokium SET ${setQuery} WHERE id = '${id}' `,
    entries.map(([_, value]) => value)
  );

  res.status(201).json({
    message: "Successfully created data.",
    data: insertedData.rows[0],
  });
});

exports.updatePengajuanKolokium = asyncHandler(async (req, res) => {
  const data = req.body;
  const { id } = req.params;

  const requiredData = {
    evaluator_1: data.evaluator_1,
    evaluator_2: data.evaluator_2,
    status_kp: data.status_kp,
    status_sks_ipk: data.status_sks_ipk,
    jadwal_pelaksanaan: data.jadwal_pelaksanaan,
  };

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== ""
  );

  if (!requiredPropsExist) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  const findData = await DB.query(
    "SELECT * FROM ta_pendaftaran_kolokium WHERE id = $1",
    [id]
  );

  if (
    findData.rows[0].kolo_pembimbing_1 &&
    !findData.rows[0].kolo_status_pem_1
  ) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }
  if (
    findData.rows[0].kolo_pembimbing_2 &&
    !findData.rows[0].kolo_status_pem_2
  ) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }
  if (
    findData.rows[0].kolo_pembimbing_3 &&
    !findData.rows[0].kolo_status_pem_3
  ) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }

  const saveData = {
    ...requiredData,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const insertedData = await DB.query(
    `UPDATE ta_pendaftaran_kolokium SET ${setQuery} WHERE id = '${id}' `,
    entries.map(([_, value]) => value)
  );

  await DB.query(
    `UPDATE ta_pengajuan_sk 
     SET status_approved_kolo = $1
     WHERE id = $2`,
    [true, findData.rows[0].pengajuan_sk_id]
  );

  res.status(201).json({
    message: "Successfully created data.",
    data: insertedData.rows[0],
  });
});

// PENILAIAN KOLOKIUM
exports.penilaianKolo = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  if (
    !data.penilaian_1 ||
    !data.penilaian_2 ||
    !data.penilaian_3 ||
    !data.penilaian_4 ||
    !data.penilaian_5 ||
    !data.komentar_singkat
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }
  const nilai1 = Math.round(0.2 * parseInt(data.penilaian_1));
  const nilai2 = Math.round(0.4 * parseInt(data.penilaian_2));
  const nilai3 = Math.round(0.1 * parseInt(data.penilaian_3));
  const nilai4 = Math.round(0.1 * parseInt(data.penilaian_4));
  const nilai5 = Math.round(0.2 * parseInt(data.penilaian_5));

  const finalNilai = nilai1 + nilai2 + nilai3 + nilai4 + nilai5;

  let hurufMutu;
  if (finalNilai >= 80 && finalNilai <= 100) {
    hurufMutu = "A";
  } else if (finalNilai >= 73 && finalNilai < 80) {
    hurufMutu = "AB";
  } else if (finalNilai >= 65 && finalNilai < 73) {
    hurufMutu = "B";
  } else if (finalNilai >= 60 && finalNilai < 65) {
    hurufMutu = "BC";
  } else if (finalNilai >= 55 && finalNilai < 60) {
    hurufMutu = "C";
  } else if (finalNilai >= 50 && finalNilai < 55) {
    hurufMutu = "CD";
  } else if (finalNilai >= 45 && finalNilai < 50) {
    hurufMutu = "D";
  } else if (finalNilai < 45) {
    hurufMutu = "E";
  }

  const dataToCreate = {
    kolo_id: data.kolo_id,
    dosen_id: userLoginId,
    peran: data.statusDosen,
    penilaian_1: data.penilaian_1,
    penilaian_2: data.penilaian_2,
    penilaian_3: data.penilaian_3,
    penilaian_4: data.penilaian_4,
    penilaian_5: data.penilaian_5,
    komentar_singkat: data.komentar_singkat,
    final_nilai: finalNilai,
    huruf_mutu: hurufMutu,
  };

  const keys = [...Object.keys(dataToCreate)];
  const values = [...Object.values(dataToCreate)];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  const saveData = await DB.query(
    `INSERT INTO ta_penilaian_kolokium(${keys.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) returning *`,
    values
  );

  await DB.query(`UPDATE ta_pengajuan_sk SET status = $1 WHERE id = $2`, [
    "menuju-sidang",
    data.pengajuan_sk_id,
  ]);

  res.status(200).json({
    message: "Successfull created data.",
    data: saveData.rows[0],
  });
});

exports.getNilaiKoloForDosen = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = req.user;

  const dataPengajuanKolo = await DB.query(
    `SELECT * FROM ta_pendaftaran_kolokium WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  if (user.role === "Dosen") {
    const userLoginId = user.user_id;
    let statusDosen = "";
    if (dataPengajuanKolo.rows[0].kolo_pembimbing_1 == userLoginId) {
      statusDosen = "pembimbing_1";
    } else if (dataPengajuanKolo.rows[0].kolo_pembimbing_2 == userLoginId) {
      statusDosen = "pembimbing_2";
    } else if (dataPengajuanKolo.rows[0].kolo_pembimbing_3 == userLoginId) {
      statusDosen = "pembimbing_3";
    } else if (dataPengajuanKolo.rows[0].evaluator_1 == userLoginId) {
      statusDosen = "evaluator_1";
    } else if (dataPengajuanKolo.rows[0].evaluator_2 == userLoginId) {
      statusDosen = "evaluator_2";
    }

    const penilaianKolo = await DB.query(
      "SELECT * FROM ta_penilaian_kolokium WHERE kolo_id = $1 AND dosen_id = $2",
      [dataPengajuanKolo.rows[0].id, userLoginId]
    );

    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanKolo.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        kolo_id: dataPengajuanKolo.rows.length
          ? `${dataPengajuanKolo.rows[0].id}`
          : null,
        statusDosen: statusDosen,
        penilaian_kolo: penilaianKolo.rows[0],
      },
    });
  } else {
    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanKolo.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        kolo_id: dataPengajuanKolo.rows.length
          ? `${dataPengajuanKolo.rows[0].id}`
          : null,
      },
    });
  }
});

exports.getNilaiKolo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dataPengajuanKolo = await DB.query(
    `SELECT * FROM ta_pendaftaran_kolokium WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  const penilaianKolo = await DB.query(
    "SELECT * FROM ta_penilaian_kolokium WHERE kolo_id = $1",
    [dataPengajuanKolo.rows[0].id]
  );

  res.status(201).json({
    data: {
      ...dataPengajuanSk.rows[0],
      ...dataPengajuanKolo.rows[0],
      pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
      kolo_id: dataPengajuanKolo.rows.length
        ? `${dataPengajuanKolo.rows[0].id}`
        : null,
      penilaian_kolo: penilaianKolo.rows,
    },
  });
});

// PENGAJUAN SIDANG
exports.getPengajuanSidangById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = req.user;

  const dataPengajuanSidang = await DB.query(
    `SELECT * FROM ta_pendaftaran_sidang WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_data_pribadi.tanggal_lahir, tb_data_pribadi.alamat, tb_data_pribadi.pekerjaan, tb_data_pribadi.alamat_pekerjaan, tb_data_pribadi.wali, tb_data_pribadi.alamat_wali, tb_data_pribadi.telp_wali, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  if (user.role === "Dosen") {
    const userLoginId = user.user_id;
    let statusDosen = 0;
    if (dataPengajuanSidang.rows[0].sidang_pembimbing_1 == userLoginId) {
      statusDosen = 1;
    } else if (dataPengajuanSidang.rows[0].sidang_pembimbing_2 == userLoginId) {
      statusDosen = 2;
    } else if (dataPengajuanSidang.rows[0].sidang_pembimbing_3 == userLoginId) {
      statusDosen = 3;
    } else if (dataPengajuanSidang.rows[0].penguji_1 == userLoginId) {
      statusDosen = "penguji_1";
    } else if (dataPengajuanSidang.rows[0].penguji_2 == userLoginId) {
      statusDosen = "penguji_2";
    }

    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanSidang.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        sidang_id: dataPengajuanSidang.rows.length
          ? `${dataPengajuanSidang.rows[0].id}`
          : null,
        statusDosen: statusDosen,
      },
    });
  } else {
    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanSidang.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        sidang_id: dataPengajuanSidang.rows.length
          ? `${dataPengajuanSidang.rows[0].id}`
          : null,
      },
    });
  }
});

exports.pengajuanSidang = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.files;
  const { id } = req.params;

  const requiredData = {
    link_khs: data.link_khs,
    link_ijazah_terakhir: data.link_ijazah_terakhir,
    link_serti_taaruf: data.link_serti_taaruf,
    link_serti_lkkm: data.link_serti_lkkm,
    link_serti_kkn: data.link_serti_kkn,
    link_serti_kompetensi: data.link_serti_kompetensi,
    link_bukti_upload_jurnal: data.link_bukti_upload_jurnal,
    link_serti_toefl: data.link_serti_toefl,
    link_bukti_keuangan: data.link_bukti_keuangan,
    link_lainya: data.link_lainya,
    jumlah_sks: data.jumlah_sks,
    link_transkip_nilai: data.link_transkip_nilai,
    link_administrasi_sidang: data.link_administrasi_sidang,
    sidang_pembimbing_1: data.sidang_pembimbing_1,
    sidang_pembimbing_2: data.sidang_pembimbing_2,
  };

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== null && val !== ""
  );

  if (!requiredPropsExist) {
    fs.unlink(file.pas_foto[0].path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    fs.unlink(file.draft_final_skripsi[0].path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  if (Object.keys(file).length === 0) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  if (
    data.sidang_pembimbing_1 == data.sidang_pembimbing_2 ||
    data.sidang_pembimbing_1 == data.sidang_pembimbing_3 ||
    data.sidang_pembimbing_2 == data.sidang_pembimbing_3
  ) {
    fs.unlink(file.pas_foto[0].path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    fs.unlink(file.draft_final_skripsi[0].path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    res.status(400);
    throw new Error("Invalid Data.");
  }

  const saveData = {
    pas_foto: file.pas_foto[0].filename,
    draft_final_skripsi: file.draft_final_skripsi[0].filename,
    ...requiredData,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const insertedData = await DB.query(
    `UPDATE ta_pendaftaran_sidang SET ${setQuery} WHERE id = '${id}' RETURNING *`,
    entries.map(([_, value]) => value)
  );

  res.status(201).json({
    message: "Successfully created data.",
    data: insertedData.rows[0],
  });
});

exports.updatePengajuanSidang = asyncHandler(async (req, res) => {
  const data = req.body;
  const { id } = req.params;

  const requiredData = {
    status_mk: data.status_mk,
    max_nilai_d: data.max_nilai_d,
    status_min_ipk: data.status_min_ipk,
    status_kp: data.status_kp,
    status_form_sidang: data.status_form_sidang,
    penguji_1: data.penguji_1,
    penguji_2: data.penguji_2,
  };

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== ""
  );

  if (!requiredPropsExist) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  const findData = await DB.query(
    "SELECT * FROM ta_pendaftaran_sidang WHERE id = $1",
    [id]
  );

  if (
    findData.rows[0].sidang_pembimbing_1 &&
    !findData.rows[0].sidang_status_pem_1
  ) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }
  if (
    findData.rows[0].sidang_pembimbing_2 &&
    !findData.rows[0].sidang_status_pem_2
  ) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }
  if (
    findData.rows[0].sidang_pembimbing_3 &&
    !findData.rows[0].sidang_status_pem_3
  ) {
    res.status(400);
    throw new Error("Status pembimbing belum acc.");
  }

  const saveData = {
    ...requiredData,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const insertedData = await DB.query(
    `UPDATE ta_pendaftaran_sidang SET ${setQuery} WHERE id = '${id}' `,
    entries.map(([_, value]) => value)
  );

  await DB.query(
    `UPDATE ta_pengajuan_sk 
     SET status_approved_sidang = $1
     WHERE id = $2`,
    [true, findData.rows[0].pengajuan_sk_id]
  );

  res.status(201).json({
    message: "Successfully created data.",
    data: insertedData.rows[0],
  });
});

// PENILAIAN SIDANG
exports.penilaianSidang = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  if (
    !data.penilaian_1 ||
    !data.penilaian_2 ||
    !data.penilaian_3 ||
    !data.penilaian_4 ||
    !data.penilaian_5 ||
    !data.komentar_singkat
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }
  const nilai1 = Math.round(0.2 * parseInt(data.penilaian_1));
  const nilai2 = Math.round(0.4 * parseInt(data.penilaian_2));
  const nilai3 = Math.round(0.1 * parseInt(data.penilaian_3));
  const nilai4 = Math.round(0.1 * parseInt(data.penilaian_4));
  const nilai5 = Math.round(0.2 * parseInt(data.penilaian_5));

  const finalNilai = nilai1 + nilai2 + nilai3 + nilai4 + nilai5;

  let hurufMutu;
  if (finalNilai >= 80 && finalNilai <= 100) {
    hurufMutu = "A";
  } else if (finalNilai >= 73 && finalNilai < 80) {
    hurufMutu = "AB";
  } else if (finalNilai >= 65 && finalNilai < 73) {
    hurufMutu = "B";
  } else if (finalNilai >= 60 && finalNilai < 65) {
    hurufMutu = "BC";
  } else if (finalNilai >= 55 && finalNilai < 60) {
    hurufMutu = "C";
  } else if (finalNilai >= 50 && finalNilai < 55) {
    hurufMutu = "CD";
  } else if (finalNilai >= 45 && finalNilai < 50) {
    hurufMutu = "D";
  } else if (finalNilai < 45) {
    hurufMutu = "E";
  }

  const dataToCreate = {
    sidang_id: data.sidang_id,
    dosen_id: userLoginId,
    peran: data.statusDosen,
    penilaian_1: data.penilaian_1,
    penilaian_2: data.penilaian_2,
    penilaian_3: data.penilaian_3,
    penilaian_4: data.penilaian_4,
    penilaian_5: data.penilaian_5,
    komentar_singkat: data.komentar_singkat,
    final_nilai: finalNilai,
    huruf_mutu: hurufMutu,
  };

  const keys = [...Object.keys(dataToCreate)];
  const values = [...Object.values(dataToCreate)];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  const saveData = await DB.query(
    `INSERT INTO ta_penilaian_sidang(${keys.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) returning *`,
    values
  );

  await DB.query(`UPDATE ta_pengajuan_sk SET status = $1 WHERE id = $2`, [
    "menyelesaikan-revisi",
    data.pengajuan_sk_id,
  ]);

  res.status(200).json({
    message: "Successfull created data.",
    data: saveData.rows[0],
  });
});

exports.getNilaiSidang = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dataPengajuanSidang = await DB.query(
    `SELECT * FROM ta_pendaftaran_sidang WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  const penilaianSidang = await DB.query(
    "SELECT * FROM ta_penilaian_sidang WHERE sidang_id = $1",
    [dataPengajuanSidang.rows[0].id]
  );

  res.status(201).json({
    data: {
      ...dataPengajuanSk.rows[0],
      ...dataPengajuanSidang.rows[0],
      pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
      sidang_id: dataPengajuanSidang.rows.length
        ? `${dataPengajuanSidang.rows[0].id}`
        : null,
      penilaian_sidang: penilaianSidang.rows,
    },
  });
});

exports.getNilaiSidangForDosen = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = req.user;

  const dataPengajuanSidang = await DB.query(
    `SELECT * FROM ta_pendaftaran_sidang WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  if (user.role === "Dosen") {
    const userLoginId = user.user_id;
    let statusDosen = "";
    if (dataPengajuanSidang.rows[0].sidang_pembimbing_1 == userLoginId) {
      statusDosen = "pembimbing_1";
    } else if (dataPengajuanSidang.rows[0].sidang_pembimbing_2 == userLoginId) {
      statusDosen = "pembimbing_2";
    } else if (dataPengajuanSidang.rows[0].sidang_pembimbing_3 == userLoginId) {
      statusDosen = "pembimbing_3";
    } else if (dataPengajuanSidang.rows[0].penguji_1 == userLoginId) {
      statusDosen = "penguji_1";
    } else if (dataPengajuanSidang.rows[0].penguji_2 == userLoginId) {
      statusDosen = "penguji_2";
    }

    const penilaianSidang = await DB.query(
      "SELECT * FROM ta_penilaian_sidang WHERE sidang_id = $1 AND dosen_id = $2",
      [dataPengajuanSidang.rows[0].id, userLoginId]
    );

    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanSidang.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        sidang_id: dataPengajuanSidang.rows.length
          ? `${dataPengajuanSidang.rows[0].id}`
          : null,
        statusDosen: statusDosen,
        penilaian_sidang: penilaianSidang.rows[0],
      },
    });
  } else {
    res.status(201).json({
      data: {
        ...dataPengajuanSk.rows[0],
        ...dataPengajuanSidang.rows[0],
        pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
        sidang_id: dataPengajuanSidang.rows.length
          ? `${dataPengajuanSidang.rows[0].id}`
          : null,
      },
    });
  }
});

// FINAL SKRIPSI
exports.getFinalSkripsi = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dataFinalSkripsi = await DB.query(
    `SELECT * FROM ta_dokumen_final_skripsi WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    message: "success",
    data: {
      ...dataFinalSkripsi.rows[0],
      ...dataPengajuanSk.rows[0],
      pengajuan_sk_id: `${dataPengajuanSk.rows[0].id}`,
      dokumen_id: dataFinalSkripsi.rows.length
        ? `${dataFinalSkripsi.rows[0].id}`
        : null,
    },
  });
});

exports.uploadFinalSkripsiController = asyncHandler(async (req, res) => {
  const file = req.files;
  const { id } = req.params;

  if (Object.keys(file).length === 0) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  const saveData = {
    lembar_pengesahan: file.lembar_pengesahan[0].filename,
    dokumen_skripsi: file.dokumen_skripsi[0].filename,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const insertedData = await DB.query(
    `UPDATE ta_dokumen_final_skripsi SET ${setQuery} WHERE id = '${id}' RETURNING *`,
    entries.map(([_, value]) => value)
  );

  await DB.query(`UPDATE ta_pengajuan_sk SET status = $1 WHERE id = $2`, [
    "selesai",
    insertedData.rows[0].pengajuan_sk_id,
  ]);

  res.status(201).json({
    message: "Successfully created data.",
    data: insertedData.rows[0],
  });
});
