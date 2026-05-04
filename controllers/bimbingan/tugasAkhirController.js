const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { getMatkulKp, getAllMatkulByMhs } = require("../../helper/informatics");
const { unixTimestamp, convertDate } = require("../../utils");
const ExcelJS = require("exceljs");

exports.pengajuanSk = asyncHandler(async (req, res) => {
  const data = req.body;
  const userLoginId = req.user.user_id;

  const { npm, nama_lengkap, ipk, curr_code } = req.user;

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

  const getKp = await getMatkulKp(npm, curr_code);
  let statusKp;
  if (getKp) {
    statusKp = getKp.grade != null ? true : false;
  }

  const dataSks = await getAllMatkulByMhs(npm, curr_code);

  const statusSksIpk = dataSks.total_credit >= 138 && ipk >= 2.0 ? true : false;

  const insertPendaftaranKolo = await DB.query(
    `INSERT INTO ta_pendaftaran_kolokium(mhs_id, pengajuan_sk_id, status_kp, status_sks_ipk, jumlah_sks, ipk, kolo_pembimbing_1, kolo_pembimbing_2, kolo_kepala_lab, judul) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      userLoginId,
      saveData.rows[0].id,
      statusKp,
      statusSksIpk,
      dataSks.total_credit,
      ipk,
      data.sk_pembimbing_1,
      data.sk_pembimbing_2,
      data.kepala_lab,
      data.judul_skripsi,
    ]
  );

  await DB.query(
    `INSERT INTO ta_nilai_akhir_kolo(kolo_id, mhs_id, nama, npm, judul, pembimbing_1, pembimbing_2) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      insertPendaftaranKolo.rows[0].id,
      userLoginId,
      nama_lengkap,
      npm,
      data.judul_skripsi,
      data.sk_pembimbing_1,
      data.sk_pembimbing_2,
    ]
  );

  const statusIPk = ipk >= 2.0 ? true : false;

  const insertPendaftaranSidang = await DB.query(
    `INSERT INTO ta_pendaftaran_sidang(mhs_id, pengajuan_sk_id, status_kp, jumlah_sks, status_min_ipk, ipk, sidang_pembimbing_1, sidang_pembimbing_2, sidang_kepala_lab, judul) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      userLoginId,
      saveData.rows[0].id,
      statusKp,
      dataSks.total_credit,
      statusIPk,
      ipk,
      data.sk_pembimbing_1,
      data.sk_pembimbing_2,
      data.kepala_lab,
      data.judul_skripsi,
    ]
  );

  await DB.query(
    `INSERT INTO ta_nilai_akhir_sidang(sidang_id, mhs_id, nama, npm, judul, pembimbing_1, pembimbing_2) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      insertPendaftaranSidang.rows[0].id,
      userLoginId,
      nama_lengkap,
      npm,
      data.judul_skripsi,
      data.sk_pembimbing_1,
      data.sk_pembimbing_2,
    ]
  );

  await DB.query(
    `INSERT INTO ta_dokumen_final_skripsi(mhs_id, pengajuan_sk_id) VALUES($1, $2)`,
    [userLoginId, saveData.rows[0].id]
  );

  await DB.query(
    `INSERT INTO ta_progres(mhs_id, pengajuan_sk_id) VALUES ($1, $2)`,
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
    WHERE sk.mhs_id = $1 AND sk.deleted_at IS NULL
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
  const { dataTable, orderField, orderValue, page, perPage, search, status } =
    req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;
  const offset = (pageNumber - 1) * itemsPerPage;

  let query = `
    SELECT 
      ta_pengajuan_sk.*, 
      tb_data_pribadi.nama_lengkap, 
      tb_users.npm, 
      ta_pendaftaran_kolokium.id AS kolo_id, 
      ta_pendaftaran_kolokium.kolo_status_pem_1, 
      ta_pendaftaran_kolokium.kolo_status_pem_2, 
      ta_pendaftaran_kolokium.kolo_status_pem_3, 
      ta_pendaftaran_sidang.jadwal_pelaksanaan, 
      ta_pendaftaran_sidang.sidang_status_pem_1, 
      ta_pendaftaran_sidang.sidang_status_pem_2, 
      ta_pendaftaran_sidang.sidang_status_pem_3, 
      ta_pendaftaran_sidang.id AS sidang_id 
    FROM ta_pengajuan_sk 
    JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id 
    JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id 
    LEFT JOIN ta_pendaftaran_kolokium ON ta_pendaftaran_kolokium.pengajuan_sk_id = ta_pengajuan_sk.id 
    LEFT JOIN ta_pendaftaran_sidang ON ta_pendaftaran_sidang.pengajuan_sk_id = ta_pengajuan_sk.id 
    WHERE ta_pengajuan_sk.deleted_at IS NULL`;

  if (status) {
    query += ` AND ta_pengajuan_sk.status = '${status}'`;
  }

  if (search) {
    query += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
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

  try {
    const result = await DB.query(query);

    let responseData = [];
    let dataWithStatusPenilaian = [];
    let totalRecords = 0;

    if (result.rows.length > 0) {
      responseData = result.rows;

      let totalRecordsQuery = `
  SELECT COUNT(*) AS total 
  FROM ta_pengajuan_sk 
  WHERE ta_pengajuan_sk.deleted_at IS NULL`;

      if (status) {
        totalRecordsQuery += ` AND ta_pengajuan_sk.status = '${status}'`;
      }

      const totalRecordsResult = await DB.query(totalRecordsQuery);
      totalRecords = totalRecordsResult.rows[0].total;

      const koloIds = responseData.map((row) => row.kolo_id).filter(Boolean);
      const sidangIds = responseData
        .map((row) => row.sidang_id)
        .filter(Boolean);

      let penilaianMap = {};
      if (koloIds.length > 0) {
        const countQuery = `
          SELECT kolo_id, COUNT(*) AS count
          FROM ta_penilaian_kolokium
          WHERE kolo_id IN (${koloIds.join(",")})
          GROUP BY kolo_id
        `;
        const countResult = await DB.query(countQuery);
        penilaianMap = countResult.rows.reduce((acc, row) => {
          acc[row.kolo_id] = row.count;
          return acc;
        }, {});
      }

      let penilaianSidangMap = {};
      if (sidangIds.length > 0) {
        const countQuerySidang = `
          SELECT sidang_id, COUNT(*) AS count
          FROM ta_penilaian_sidang
          WHERE sidang_id IN (${sidangIds.join(",")})
          GROUP BY sidang_id
        `;
        const countResultSidang = await DB.query(countQuerySidang);
        penilaianSidangMap = countResultSidang.rows.reduce((acc, row) => {
          acc[row.sidang_id] = row.count;
          return acc;
        }, {});
      }

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

    const dataWithStatusDosen = dataWithStatusPenilaian.map((row) => {
      let statusDospem = "Belum Acc";

      if (row.status == "pengajuan-sk") {
        if (
          row.sk_status_pem_1 &&
          row.sk_status_pem_2 &&
          row.status_kepala_lab
        ) {
          statusDospem = "ACC";
        }
      } else if (row.status == "menuju-kolokium") {
        if (row.kolo_status_pem_1 && row.kolo_status_pem_2) {
          statusDospem = "ACC";
        }
      } else if (row.status == "menuju-sidang") {
        if (row.sidang_status_pem_1 && row.sidang_status_pem_2) {
          statusDospem = "ACC";
        }
      } else if (
        row.status == "menyelesaikan-revisi" ||
        row.status == "selesai"
      ) {
        statusDospem = "ACC";
      }

      return {
        ...row,
        statusDospem,
      };
    });

    if (dataTable === "true") {
      responseData = {
        message: "success",
        draw: 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: dataWithStatusDosen,
      };
    } else {
      responseData = {
        message: "success",
        data: dataWithStatusDosen,
      };
    }

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

exports.getForDosen = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const { status, dataTable, orderField, orderValue, page, perPage, search } =
    req.query;

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
      CASE WHEN ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Sidang 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Sidang 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Sidang 3 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END
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
 ( ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR
  ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_2 = '${userLoginId}') AND ta_pengajuan_sk.deleted_at IS NULL
`;
  if (status) {
    query += ` AND ta_pengajuan_sk.status = '${status}'`;
  }

  if (search) {
    query += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
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

    let totalRecordsQuery = `
    SELECT COUNT(*) AS total
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
      ( ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR
      ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR
      ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR
      ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
      ta_pendaftaran_sidang.penguji_2 = '${userLoginId}') AND ta_pengajuan_sk.deleted_at IS NULL
  `;

    if (search) {
      totalRecordsQuery += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
    }

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

exports.detailPengajuanSkForProgres = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userLoginId = req.user.user_id;

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
      CASE WHEN ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Sidang 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Sidang 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Sidang 3 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END
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
 ( ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR
  ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_2 = '${userLoginId}') AND ta_pengajuan_sk.deleted_at IS NULL AND ta_pengajuan_sk.id = ${id}`;

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
  const {
    nomor_sk,
    tgl_sk,
    link_dokumen_sk,
    nomor_nota_dinas,
    judul_skripsi,
    semester,
    lokasi_kegiatan,
    status,
  } = req.body;

  if (!nomor_nota_dinas) {
    res.status(400);
    throw new Error("Silahkan cetak nomor nota dinas terlebih dahulu");
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

  const updateData = await DB.query(
    `UPDATE ta_pengajuan_sk 
     SET nomor_sk = $1, tgl_sk = $2, link_dokumen_sk = $3, status = $4, status_approved = $5, judul_skripsi = $6, semester = $7, lokasi_kegiatan = $8
     WHERE id = $9`,
    [
      nomor_sk,
      tgl_sk,
      link_dokumen_sk,
      status,
      true,
      judul_skripsi,
      semester,
      lokasi_kegiatan,
      id,
    ]
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateData.rows[0],
  });
});

exports.updateKelulusan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status_kelulusan } = req.body;

  const updateData = await DB.query(
    `UPDATE ta_pengajuan_sk SET status_kelulusan = $1 WHERE id = $2`,
    [status_kelulusan, id]
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

  if (user.role === "Dosen" || user.role === "Dosen_Ext") {
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
    } else if (dataPengajuanKolo.rows[0].kolo_kepala_lab == userLoginId) {
      statusDosen = "kepala_lab";
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

  const getDataKolo = await DB.query(
    "SELECT * FROM ta_pendaftaran_kolokium WHERE id = $1",
    [id]
  );

  const requiredData = {
    link_dok_mhs_aktif: data.link_dok_mhs_aktif,
    link_dok_pembayaran: data.link_dok_pembayaran,
    kolo_pembimbing_1: data.kolo_pembimbing_1,
    kolo_pembimbing_2: data.kolo_pembimbing_2,
    kolo_kepala_lab: data.kolo_kepala_lab,
    link_dok_makalah: data.link_dok_makalah,
    judul: data.judul,
  };

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== "" && val !== null && val != "null"
  );

  if (!requiredPropsExist) {
    res.status(400);
    throw new Error("Pleas fill in all the (*) required fields.");
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
    file_makalah: null,
    ...requiredData,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const insertedData = await DB.query(
    `UPDATE ta_pendaftaran_kolokium SET ${setQuery} WHERE id = '${id}' RETURNING *`,
    entries.map(([_, value]) => value)
  );

  await DB.query(
    "UPDATE ta_nilai_akhir_kolo SET judul = $1, pembimbing_1 = $2, pembimbing_2 = $3 WHERE kolo_id = $4",
    [
      requiredData.judul,
      requiredData.kolo_pembimbing_1,
      requiredData.kolo_pembimbing_2,
      id,
    ]
  );

  await DB.query(
    "UPDATE ta_pendaftaran_sidang SET judul=$1 WHERE pengajuan_sk_id = $2",
    [data.judul, insertedData.rows[0].pengajuan_sk_id]
  );

  res.status(201).json({
    message: "Successfully created data.",
    data: insertedData.rows[0],
  });
});

exports.updatePengajuanKolokium = asyncHandler(async (req, res) => {
  const data = req.body;
  const { id } = req.params;
  const file = req.file;

  const findData = await DB.query(
    "SELECT * FROM ta_pendaftaran_kolokium WHERE id = $1",
    [id]
  );

  const dataMahasiswa = {
    link_dok_mhs_aktif: data.link_dok_mhs_aktif,
    link_dok_pembayaran: data.link_dok_pembayaran,
    kolo_pembimbing_1: data.kolo_pembimbing_1,
    kolo_pembimbing_2: data.kolo_pembimbing_2,
    kolo_kepala_lab: data.kolo_kepala_lab,
    link_dok_makalah: data.link_dok_makalah,
    judul: data.judul,
  };

  let saveDataMhs;

  if (file) {
    saveDataMhs = {
      file_makalah: file.filename,
      ...dataMahasiswa,
    };
  } else {
    saveDataMhs = {
      ...dataMahasiswa,
    };
  }

  const entriesMhs = Object.entries(saveDataMhs);
  const setQueryMhs = entriesMhs
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const insertedDataMhs = await DB.query(
    `UPDATE ta_pendaftaran_kolokium SET ${setQueryMhs} WHERE id = '${id}' RETURNING *`,
    entriesMhs.map(([_, value]) => value)
  );

  await DB.query(
    "UPDATE ta_pendaftaran_sidang SET judul=$1 WHERE pengajuan_sk_id = $2",
    [data.judul, insertedDataMhs.rows[0].pengajuan_sk_id]
  );

  const requiredData = {
    evaluator_1: data.evaluator_1,
    evaluator_2: data.evaluator_2,
    status_kp: data.status_kp,
    status_sks_ipk: data.status_sks_ipk,
    jadwal_pelaksanaan: data.jadwal_pelaksanaan,
  };

  await DB.query(
    "UPDATE ta_nilai_akhir_kolo SET judul = $1, pembimbing_1 = $2, pembimbing_2 = $3, evaluator_1 = $4, evaluator_2 = $5, tanggal = $6 WHERE kolo_id = $7",
    [
      dataMahasiswa.judul,
      dataMahasiswa.kolo_pembimbing_1,
      dataMahasiswa.kolo_pembimbing_2,
      requiredData.evaluator_1,
      requiredData.evaluator_2,
      requiredData.jadwal_pelaksanaan,
      id,
    ]
  );

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== "" && val !== null
  );

  if (!requiredPropsExist) {
    res.status(400);
    throw new Error("Please fill in all the (*) required fields.");
  }

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
     SET status = $1, status_approved_kolo = $2
     WHERE id = $3`,
    [data.status, true, findData.rows[0].pengajuan_sk_id]
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
    !data.penilaian_5
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const nilai1 = 0.2 * parseInt(data.penilaian_1);
  const nilai2 = 0.4 * parseInt(data.penilaian_2);
  const nilai3 = 0.1 * parseInt(data.penilaian_3);
  const nilai4 = 0.1 * parseInt(data.penilaian_4);
  const nilai5 = 0.2 * parseInt(data.penilaian_5);

  const finalNilai = Math.round(nilai1 + nilai2 + nilai3 + nilai4 + nilai5);

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
    komentar_singkat: data.komentar_singkat ? data.komentar_singkat : "",
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

  const resultPenilaian = await DB.query(
    "SELECT * FROM ta_penilaian_kolokium WHERE kolo_id = $1",
    [saveData.rows[0].kolo_id]
  );
  const totalData = resultPenilaian.rowCount;

  const calculateAverage = (columnName) => {
    const jumlahPenilaian = resultPenilaian.rows.reduce(
      (acc, current) => acc + current[columnName],
      0
    );
    const averagePenilaian = Math.round(jumlahPenilaian / totalData);
    return averagePenilaian;
  };

  const nilaiAkhir1 = calculateAverage("penilaian_1");
  const nilaiAkhir2 = calculateAverage("penilaian_2");
  const nilaiAkhir3 = calculateAverage("penilaian_3");
  const nilaiAkhir4 = calculateAverage("penilaian_4");
  const nilaiAkhir5 = calculateAverage("penilaian_5");
  const finalNilaiAkhir = calculateAverage("final_nilai");

  let hurufMutuAkhir;
  if (finalNilaiAkhir >= 80 && finalNilaiAkhir <= 100) {
    hurufMutuAkhir = "A";
  } else if (finalNilaiAkhir >= 73 && finalNilaiAkhir < 80) {
    hurufMutuAkhir = "AB";
  } else if (finalNilaiAkhir >= 65 && finalNilaiAkhir < 73) {
    hurufMutuAkhir = "B";
  } else if (finalNilaiAkhir >= 60 && finalNilaiAkhir < 65) {
    hurufMutuAkhir = "BC";
  } else if (finalNilaiAkhir >= 55 && finalNilaiAkhir < 60) {
    hurufMutuAkhir = "C";
  } else if (finalNilaiAkhir >= 50 && finalNilaiAkhir < 55) {
    hurufMutuAkhir = "CD";
  } else if (finalNilaiAkhir >= 45 && finalNilaiAkhir < 50) {
    hurufMutuAkhir = "D";
  } else if (finalNilaiAkhir < 45) {
    hurufMutuAkhir = "E";
  }

  await DB.query(
    "UPDATE ta_nilai_akhir_kolo SET penilaian_1 = $1, penilaian_2 = $2, penilaian_3 = $3, penilaian_4 = $4, penilaian_5 = $5, nilai_akhir = $6, huruf_mutu = $7 WHERE kolo_id = $8",
    [
      Math.round(nilaiAkhir1),
      Math.round(nilaiAkhir2),
      Math.round(nilaiAkhir3),
      Math.round(nilaiAkhir4),
      Math.round(nilaiAkhir5),
      Math.round(finalNilaiAkhir),
      hurufMutuAkhir,
      data.kolo_id,
    ]
  );
  await DB.query(`UPDATE ta_pengajuan_sk SET status = $1 WHERE id = $2`, [
    "menuju-sidang",
    data.pengajuan_sk_id,
  ]);

  res.status(200).json({
    message: "Successfully created data.",
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

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_users.email, tb_users.npm, ta_pendaftaran_kolokium.link_dok_makalah FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id JOIN ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  if (user.role === "Dosen" || user.role === "Dosen_Ext") {
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
    } else if (dataPengajuanKolo.rows[0].kolo_kepala_lab == userLoginId) {
      statusDosen = "kepala_lab";
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

  let textQuery;

  if (user.role == "Mahasiswa") {
    textQuery =
      "SELECT ta_penilaian_kolokium.id, ta_penilaian_kolokium.kolo_id, ta_penilaian_kolokium.dosen_id, ta_penilaian_kolokium.peran, ta_penilaian_kolokium.komentar_singkat FROM ta_penilaian_kolokium WHERE kolo_id = $1";
  } else {
    textQuery = "SELECT * FROM ta_penilaian_kolokium WHERE kolo_id = $1";
  }

  const penilaianKolo = await DB.query(textQuery, [
    dataPengajuanKolo.rows[0].id,
  ]);

  const penilaianKoloAkhir = await DB.query(
    "SELECT * FROM ta_nilai_akhir_kolo WHERE kolo_id = $1",
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
      nilai_akhir: penilaianKoloAkhir.rows[0],
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

  if (user.role === "Dosen" || user.role === "Dosen_Ext") {
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
    } else if (dataPengajuanSidang.rows[0].sidang_kepala_lab == userLoginId) {
      statusDosen = "kepala_lab";
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

  const getDataById = await DB.query(
    "SELECT * FROM ta_pendaftaran_sidang WHERE id = $1",
    [id]
  );

  const existsPasFoto = getDataById.rows[0].pas_foto ? true : false;

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
    link_draft_final_skripsi: data.link_draft_final_skripsi,
    jumlah_sks: data.jumlah_sks,
    link_transkip_nilai: data.link_transkip_nilai,
    link_administrasi_sidang: data.link_administrasi_sidang,
    sidang_pembimbing_1: data.sidang_pembimbing_1,
    sidang_pembimbing_2: data.sidang_pembimbing_2,
    sidang_kepala_lab: data.sidang_kepala_lab,
    peminatan: data.peminatan,
    program_studi: data.program_studi,
    judul: data.judul,
  };

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== null && val !== "" && val !== "null"
  );

  if (!requiredPropsExist) {
    res.status(400);
    throw new Error("Pleas fill in all the (*) required fields.");
  }

  if (!existsPasFoto) {
    if (!requiredPropsExist) {
      fs.unlink(file.pas_foto[0].path, (err) => {
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
      link_lainya: data.link_lainya,
      draft_final_skripsi: null,
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
  } else {
    const saveData = {
      link_lainya: data.link_lainya,
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
  }
});

exports.updatePengajuanSidang = asyncHandler(async (req, res) => {
  const data = req.body;
  const { id } = req.params;

  const file = req.files;

  const findData = await DB.query(
    "SELECT * FROM ta_pendaftaran_sidang WHERE id = $1",
    [id]
  );

  const existsPasFoto = findData.rows[0].pas_foto ? true : false;

  const requiredDataMhs = {
    link_khs: data.link_khs,
    link_ijazah_terakhir: data.link_ijazah_terakhir,
    link_serti_taaruf: data.link_serti_taaruf,
    link_serti_lkkm: data.link_serti_lkkm,
    link_serti_kkn: data.link_serti_kkn,
    link_serti_kompetensi: data.link_serti_kompetensi,
    link_bukti_upload_jurnal: data.link_bukti_upload_jurnal,
    link_serti_toefl: data.link_serti_toefl,
    link_bukti_keuangan: data.link_bukti_keuangan,
    link_draft_final_skripsi: data.link_draft_final_skripsi,
    jumlah_sks: data.jumlah_sks,
    link_transkip_nilai: data.link_transkip_nilai,
    link_administrasi_sidang: data.link_administrasi_sidang,
    sidang_pembimbing_1: data.sidang_pembimbing_1,
    sidang_pembimbing_2: data.sidang_pembimbing_2,
    sidang_kepala_lab: data.sidang_kepala_lab,
    peminatan: data.peminatan,
    program_studi: data.program_studi,
    judul: data.judul,
  };

  const requiredPropsExistMhs = Object.values(requiredDataMhs).every(
    (val) => val !== undefined && val !== null && val !== "" && val !== "null"
  );

  if (!requiredPropsExistMhs) {
    res.status(400);
    throw new Error("Pleas fill in all the (*) required fields mahasiswa.");
  }

  if (!existsPasFoto) {
    if (!requiredPropsExistMhs) {
      fs.unlink(file.pas_foto[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Pleas fill in all the required fields mahasiswa.");
    }
    if (Object.keys(file).length === 0) {
      res.status(400);
      throw new Error("Please fill in one file.");
    }

    const saveData = {
      pas_foto: file.pas_foto[0].filename,
      link_lainya: data.link_lainya,
      ...requiredDataMhs,
    };

    const entries = Object.entries(saveData);
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    await DB.query(
      `UPDATE ta_pendaftaran_sidang SET ${setQuery} WHERE id = '${id}' RETURNING *`,
      entries.map(([_, value]) => value)
    );
  } else {
    let saveData = {
      link_lainya: data.link_lainya,
      ...requiredDataMhs,
    };

    if (file.pas_foto && file.pas_foto[0]) {
      await fs.remove(
        path.join(`public/tugas-akhir/pas-foto/${findData.rows[0].pas_foto}`)
      );
      saveData.pas_foto = file.pas_foto[0].filename;
    }

    const entries = Object.entries(saveData);
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    await DB.query(
      `UPDATE ta_pendaftaran_sidang SET ${setQuery} WHERE id = '${id}' RETURNING *`,
      entries.map(([_, value]) => value)
    );
  }

  const requiredData = {
    status_mk: data.status_mk,
    max_nilai_d: data.max_nilai_d,
    status_min_ipk: data.status_min_ipk,
    status_kp: data.status_kp,
    jadwal_pelaksanaan: data.jadwal_pelaksanaan,
    status_form_sidang: data.status_form_sidang,
    penguji_1: data.penguji_1,
    penguji_2: data.penguji_2,
  };
  await DB.query(
    "UPDATE ta_nilai_akhir_sidang SET judul = $1, pembimbing_1 = $2, pembimbing_2 = $3, penguji_1 = $4, penguji_2 = $5, tanggal = $6 WHERE sidang_id = $7 RETURNING *",
    [
      requiredDataMhs.judul,
      requiredDataMhs.sidang_pembimbing_1,
      requiredDataMhs.sidang_pembimbing_2,
      requiredData.penguji_1,
      requiredData.penguji_2,
      requiredData.jadwal_pelaksanaan,
      id,
    ]
  );

  const requiredPropsExist = Object.values(requiredData).every(
    (val) => val !== undefined && val !== "" && val !== null && val !== "null"
  );

  if (!requiredPropsExist) {
    res.status(400);
    throw new Error("Please fill in all the (*) required fields pengajuan.");
  }

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
    `UPDATE ta_pendaftaran_sidang SET ${setQuery} WHERE id = '${id}' returning *`,
    entries.map(([_, value]) => value)
  );

  await DB.query(
    `UPDATE ta_pengajuan_sk 
     SET status = $1, status_approved_sidang = $2
     WHERE id = $3`,
    [data.status, true, findData.rows[0].pengajuan_sk_id]
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
    !data.penilaian_4
  ) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  // Menghitung penilaian akhir tanpa pembulatan setiap komponen
  const nilai1 = 0.4 * parseInt(data.penilaian_1);
  const nilai2 = 0.1 * parseInt(data.penilaian_2);
  const nilai3 = 0.4 * parseInt(data.penilaian_3);
  const nilai4 = 0.1 * parseInt(data.penilaian_4);

  const finalNilai = Math.round(nilai1 + nilai2 + nilai3 + nilai4);

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
    komentar_singkat: data.komentar_singkat ? data.komentar_singkat : "",
    final_nilai: finalNilai,
    huruf_mutu: hurufMutu,
  };

  const keys = Object.keys(dataToCreate);
  const values = Object.values(dataToCreate);
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  const saveData = await DB.query(
    `INSERT INTO ta_penilaian_sidang(${keys.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) returning *`,
    values
  );

  const resultPenilaian = await DB.query(
    "SELECT * FROM ta_penilaian_sidang WHERE sidang_id = $1",
    [saveData.rows[0].sidang_id]
  );

  const calculateAverage = (columnName) => {
    const totalPenilaian = resultPenilaian.rows.reduce(
      (acc, current) => acc + parseInt(current[columnName] || 0),
      0
    );
    const averagePenilaian = Math.round(
      totalPenilaian / resultPenilaian.rowCount
    );
    return averagePenilaian;
  };

  const nilaiAkhir1 = calculateAverage("penilaian_1");
  const nilaiAkhir2 = calculateAverage("penilaian_2");
  const nilaiAkhir3 = calculateAverage("penilaian_3");
  const nilaiAkhir4 = calculateAverage("penilaian_4");
  const finalNilaiAkhir = calculateAverage("final_nilai");

  let hurufMutuAkhir;
  if (finalNilaiAkhir >= 80 && finalNilaiAkhir <= 100) {
    hurufMutuAkhir = "A";
  } else if (finalNilaiAkhir >= 73 && finalNilaiAkhir < 80) {
    hurufMutuAkhir = "AB";
  } else if (finalNilaiAkhir >= 65 && finalNilaiAkhir < 73) {
    hurufMutuAkhir = "B";
  } else if (finalNilaiAkhir >= 60 && finalNilaiAkhir < 65) {
    hurufMutuAkhir = "BC";
  } else if (finalNilaiAkhir >= 55 && finalNilaiAkhir < 60) {
    hurufMutuAkhir = "C";
  } else if (finalNilaiAkhir >= 50 && finalNilaiAkhir < 55) {
    hurufMutuAkhir = "CD";
  } else if (finalNilaiAkhir >= 45 && finalNilaiAkhir < 50) {
    hurufMutuAkhir = "D";
  } else if (finalNilaiAkhir < 45) {
    hurufMutuAkhir = "E";
  }

  await DB.query(
    "UPDATE ta_nilai_akhir_sidang SET penilaian_1 = $1, penilaian_2 = $2, penilaian_3 = $3, penilaian_4 = $4, nilai_akhir = $5, huruf_mutu = $6 WHERE sidang_id = $7",
    [
      Math.round(nilaiAkhir1),
      Math.round(nilaiAkhir2),
      Math.round(nilaiAkhir3),
      Math.round(nilaiAkhir4),
      Math.round(finalNilaiAkhir),
      hurufMutuAkhir,
      data.sidang_id,
    ]
  );

  await DB.query(`UPDATE ta_pengajuan_sk SET status = $1 WHERE id = $2`, [
    "menyelesaikan-revisi",
    data.pengajuan_sk_id,
  ]);

  res.status(200).json({
    message: "Successfully created data.",
    data: saveData.rows[0],
  });
});

exports.getNilaiSidang = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = req.user;

  const dataPengajuanSidang = await DB.query(
    `SELECT * FROM ta_pendaftaran_sidang WHERE pengajuan_sk_id = $1`,
    [id]
  );

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_data_pribadi.no_hp, tb_data_pribadi.tempat_lahir, tb_data_pribadi.tanggal_lahir, tb_users.email, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

  const dataPengajuanSk = await DB.query(query);

  if (!dataPengajuanSk.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  let textQuery;

  if (user.role == "Mahasiswa") {
    textQuery =
      "SELECT ta_penilaian_sidang.id, ta_penilaian_sidang.sidang_id, ta_penilaian_sidang.dosen_id, ta_penilaian_sidang.peran, ta_penilaian_sidang.komentar_singkat FROM ta_penilaian_sidang WHERE sidang_id = $1";
  } else {
    textQuery = "SELECT * FROM ta_penilaian_sidang WHERE sidang_id = $1";
  }

  const penilaianSidang = await DB.query(textQuery, [
    dataPengajuanSidang.rows[0].id,
  ]);

  const penilaianSidangAkhir = await DB.query(
    "SELECT * FROM ta_nilai_akhir_sidang WHERE sidang_id = $1",
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
      nilai_akhir: penilaianSidangAkhir.rows[0],
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

  if (user.role === "Dosen_Ext" || user.role === "Dosen") {
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
    } else if (dataPengajuanSidang.rows[0].sidang_kepala_lab == userLoginId) {
      statusDosen = "kepala_lab";
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

// Update penilaian
exports.updatePenilaian = asyncHandler(async (req, res) => {
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

  // Menghitung penilaian akhir tanpa pembulatan setiap komponen
  const nilai1 = 0.2 * parseInt(saveData.rows[0].penilaian_1);
  const nilai2 = 0.4 * parseInt(saveData.rows[0].penilaian_2);
  const nilai3 = 0.1 * parseInt(saveData.rows[0].penilaian_3);
  const nilai4 = 0.1 * parseInt(saveData.rows[0].penilaian_4);
  const nilai5 = 0.2 * parseInt(saveData.rows[0].penilaian_5);

  const finalNilai = Math.round(nilai1 + nilai2 + nilai3 + nilai4 + nilai5);

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

  const updateFinalNilai = await DB.query(
    `UPDATE ${db} SET final_nilai = $1, huruf_mutu = $2 WHERE id = $3 RETURNING *`,
    [finalNilai, hurufMutu, id]
  );

  const dbAkhir =
    db === "ta_penilaian_sidang"
      ? "ta_nilai_akhir_sidang"
      : db === "ta_penilaian_kolokium"
      ? "ta_nilai_akhir_kolo"
      : "";

  const queryId =
    db === "ta_penilaian_sidang"
      ? "sidang_id"
      : db === "ta_penilaian_kolokium"
      ? "kolo_id"
      : "";

  const dataQueryId =
    db === "ta_penilaian_sidang"
      ? saveData.rows[0].sidang_id
      : db === "ta_penilaian_kolokium"
      ? saveData.rows[0].kolo_id
      : "";

  const resultPenilaian = await DB.query(
    `SELECT * FROM ${db} WHERE ${queryId} = $1`,
    [dataQueryId]
  );

  const totalData = resultPenilaian.rowCount;

  const calculateAverage = (columnName) => {
    const jumlahPenilaian = resultPenilaian.rows.reduce(
      (acc, current) => acc + current[columnName],
      0
    );
    const averagePenilaian = Math.round(jumlahPenilaian / totalData);
    return averagePenilaian;
  };

  const nilaiAkhir1 = calculateAverage("penilaian_1");
  const nilaiAkhir2 = calculateAverage("penilaian_2");
  const nilaiAkhir3 = calculateAverage("penilaian_3");
  const nilaiAkhir4 = calculateAverage("penilaian_4");
  const nilaiAkhir5 = calculateAverage("penilaian_5");
  const finalNilaiAkhir = calculateAverage("final_nilai");

  let hurufMutuAkhir;
  if (finalNilaiAkhir >= 80 && finalNilaiAkhir <= 100) {
    hurufMutuAkhir = "A";
  } else if (finalNilaiAkhir >= 73 && finalNilaiAkhir < 80) {
    hurufMutuAkhir = "AB";
  } else if (finalNilaiAkhir >= 65 && finalNilaiAkhir < 73) {
    hurufMutuAkhir = "B";
  } else if (finalNilaiAkhir >= 60 && finalNilaiAkhir < 65) {
    hurufMutuAkhir = "BC";
  } else if (finalNilaiAkhir >= 55 && finalNilaiAkhir < 60) {
    hurufMutuAkhir = "C";
  } else if (finalNilaiAkhir >= 50 && finalNilaiAkhir < 55) {
    hurufMutuAkhir = "CD";
  } else if (finalNilaiAkhir >= 45 && finalNilaiAkhir < 50) {
    hurufMutuAkhir = "D";
  } else if (finalNilaiAkhir < 45) {
    hurufMutuAkhir = "E";
  }

  await DB.query(
    `UPDATE ${dbAkhir} SET penilaian_1 = $1, penilaian_2 = $2, penilaian_3 = $3, penilaian_4 = $4, penilaian_5 = $5, nilai_akhir = $6, huruf_mutu = $7 WHERE ${queryId} = $8 RETURNING *`,
    [
      Math.round(nilaiAkhir1),
      Math.round(nilaiAkhir2),
      Math.round(nilaiAkhir3),
      Math.round(nilaiAkhir4),
      Math.round(nilaiAkhir5),
      Math.round(finalNilaiAkhir),
      hurufMutuAkhir,
      dataQueryId,
    ]
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateFinalNilai.rows[0],
  });
});

exports.updatePenilaianSidang = asyncHandler(async (req, res) => {
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

  // Menghitung penilaian akhir tanpa pembulatan setiap komponen
  const nilai1 = 0.4 * parseInt(saveData.rows[0].penilaian_1);
  const nilai2 = 0.1 * parseInt(saveData.rows[0].penilaian_2);
  const nilai3 = 0.4 * parseInt(saveData.rows[0].penilaian_3);
  const nilai4 = 0.1 * parseInt(saveData.rows[0].penilaian_4);

  const finalNilai = Math.round(nilai1 + nilai2 + nilai3 + nilai4);

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

  const updateFinalNilai = await DB.query(
    `UPDATE ${db} SET final_nilai = $1, huruf_mutu = $2 WHERE id = $3 RETURNING *`,
    [finalNilai, hurufMutu, id]
  );

  const dbAkhir =
    db === "ta_penilaian_sidang"
      ? "ta_nilai_akhir_sidang"
      : db === "ta_penilaian_kolokium"
      ? "ta_nilai_akhir_kolo"
      : "";

  const queryId =
    db === "ta_penilaian_sidang"
      ? "sidang_id"
      : db === "ta_penilaian_kolokium"
      ? "kolo_id"
      : "";

  const dataQueryId =
    db === "ta_penilaian_sidang"
      ? saveData.rows[0].sidang_id
      : db === "ta_penilaian_kolokium"
      ? saveData.rows[0].kolo_id
      : "";

  const resultPenilaian = await DB.query(
    `SELECT * FROM ${db} WHERE ${queryId} = $1`,
    [dataQueryId]
  );

  const totalData = resultPenilaian.rowCount;

  const calculateAverage = (columnName) => {
    const jumlahPenilaian = resultPenilaian.rows.reduce(
      (acc, current) => acc + current[columnName],
      0
    );
    const averagePenilaian = Math.round(jumlahPenilaian / totalData);
    return averagePenilaian;
  };

  const nilaiAkhir1 = calculateAverage("penilaian_1");
  const nilaiAkhir2 = calculateAverage("penilaian_2");
  const nilaiAkhir3 = calculateAverage("penilaian_3");
  const nilaiAkhir4 = calculateAverage("penilaian_4");
  const finalNilaiAkhir = calculateAverage("final_nilai");

  let hurufMutuAkhir;
  if (finalNilaiAkhir >= 80 && finalNilaiAkhir <= 100) {
    hurufMutuAkhir = "A";
  } else if (finalNilaiAkhir >= 73 && finalNilaiAkhir < 80) {
    hurufMutuAkhir = "AB";
  } else if (finalNilaiAkhir >= 65 && finalNilaiAkhir < 73) {
    hurufMutuAkhir = "B";
  } else if (finalNilaiAkhir >= 60 && finalNilaiAkhir < 65) {
    hurufMutuAkhir = "BC";
  } else if (finalNilaiAkhir >= 55 && finalNilaiAkhir < 60) {
    hurufMutuAkhir = "C";
  } else if (finalNilaiAkhir >= 50 && finalNilaiAkhir < 55) {
    hurufMutuAkhir = "CD";
  } else if (finalNilaiAkhir >= 45 && finalNilaiAkhir < 50) {
    hurufMutuAkhir = "D";
  } else if (finalNilaiAkhir < 45) {
    hurufMutuAkhir = "E";
  }

  await DB.query(
    `UPDATE ${dbAkhir} SET penilaian_1 = $1, penilaian_2 = $2, penilaian_3 = $3, penilaian_4 = $4, nilai_akhir = $5, huruf_mutu = $6 WHERE ${queryId} = $7 RETURNING *`,
    [
      Math.round(nilaiAkhir1),
      Math.round(nilaiAkhir2),
      Math.round(nilaiAkhir3),
      Math.round(nilaiAkhir4),
      Math.round(finalNilaiAkhir),
      hurufMutuAkhir,
      dataQueryId,
    ]
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateFinalNilai.rows[0],
  });
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

exports.getNomorNota = asyncHandler(async (req, res) => {
  const { nomorNota, data } = req.body;

  const updatePromises = data.map(async (row) => {
    try {
      const updateData = await DB.query(
        `UPDATE ta_pengajuan_sk 
         SET nomor_nota_dinas = $1
         WHERE mhs_id = $2`,
        [nomorNota, row.mhs_id]
      );
      return updateData;
    } catch (error) {
      throw new Error(error);
    }
  });

  try {
    const updateResults = await Promise.all(updatePromises);
    res.status(200).json({
      message: "Success updating nomor nota dinas.",
      data: updateResults,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating nomor nota dinas.",
      error: error.message,
    });
  }
});

// delete
exports.deleteData = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    `SELECT * FROM ta_pengajuan_sk WHERE id = $1`,
    [id]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  await DB.query(
    "UPDATE ta_pengajuan_sk SET deleted_at = $1 WHERE id = $2 RETURNING *",
    [convert, id]
  );

  res.status(201).json({
    message: "Successfully update data.",
  });
});

// update nilai akhir kolokium
exports.updateNilaiAkhirKolo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    `SELECT * FROM ta_nilai_akhir_kolo WHERE kolo_id = $1`,
    [id]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  const saveData = {
    nama: req.body.nama,
    npm: req.body.npm,
    judul: req.body.judul,
    tanggal: req.body.tanggal,
    waktu: req.body.waktu,
    tempat: req.body.tempat,
    pembimbing_1: req.body.pembimbing_1,
    pembimbing_2: req.body.pembimbing_2,
    evaluator_1: req.body.evaluator_1,
    evaluator_2: req.body.evaluator_2,
    komentar: req.body.komentar,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const updateData = await DB.query(
    `UPDATE ta_nilai_akhir_kolo SET ${setQuery} WHERE kolo_id = '${id}' RETURNING *`,
    entries.map(([_, value]) => value)
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateData.rows[0],
  });
});

exports.updateNilaiAkhirSidang = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    `SELECT * FROM ta_nilai_akhir_sidang WHERE sidang_id = $1`,
    [id]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  const saveData = {
    nama: req.body.nama,
    npm: req.body.npm,
    judul: req.body.judul,
    tanggal: req.body.tanggal,
    waktu: req.body.waktu,
    tempat: req.body.tempat,
    ketua_penguji: req.body.ketua_penguji,
    pembimbing_1: req.body.pembimbing_1,
    pembimbing_2: req.body.pembimbing_2,
    penguji_1: req.body.penguji_1,
    penguji_2: req.body.penguji_2,
    sekertaris_sidang: req.body.sekertaris_sidang,
    status_kelulusan: req.body.status_kelulusan,
    komentar: req.body.komentar,
  };

  const entries = Object.entries(saveData);
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const updateData = await DB.query(
    `UPDATE ta_nilai_akhir_sidang SET ${setQuery} WHERE sidang_id = '${id}' RETURNING *`,
    entries.map(([_, value]) => value)
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateData.rows[0],
  });
});

exports.getRekapPenilaianKolokium = asyncHandler(async (req, res) => {
  const {
    filter,
    filterValue,
    dataTable,
    orderField,
    orderValue,
    page,
    perPage,
    search,
  } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;
  const offset = (pageNumber - 1) * itemsPerPage;

  let baseQuery = `
    SELECT 
      ta_pendaftaran_kolokium.id, 
      ta_pendaftaran_kolokium.mhs_id, 
      ta_pendaftaran_kolokium.kolo_pembimbing_1,
      ta_pendaftaran_kolokium.kolo_pembimbing_2,
      ta_pendaftaran_kolokium.kolo_pembimbing_3,
      ta_pendaftaran_kolokium.evaluator_1,
      ta_pendaftaran_kolokium.evaluator_2,
      ta_pengajuan_sk.deleted_at, 
      ta_pengajuan_sk.id AS sk_id, 
      tb_data_pribadi.user_id, 
      tb_data_pribadi.nama_lengkap, 
      tb_users.user_id,
      tb_users.npm,
      ta_nilai_akhir_kolo.nilai_akhir as nilai_akhir_kolo,
      ta_nilai_akhir_kolo.huruf_mutu as huruf_mutu_akhir_kolo
    FROM 
      ta_pendaftaran_kolokium 
    LEFT JOIN 
      ta_pengajuan_sk ON ta_pendaftaran_kolokium.pengajuan_sk_id = ta_pengajuan_sk.id 
    JOIN 
      ta_nilai_akhir_kolo ON ta_pendaftaran_kolokium.id = ta_nilai_akhir_kolo.kolo_id 
    JOIN 
      tb_data_pribadi ON ta_pendaftaran_kolokium.mhs_id = tb_data_pribadi.user_id 
    JOIN
      tb_users ON ta_pendaftaran_kolokium.mhs_id = tb_users.user_id
    WHERE 
      ta_pengajuan_sk.deleted_at IS NULL AND ta_pengajuan_sk.status = 'menuju-sidang' OR ta_pengajuan_sk.status = 'menyelesaikan-revisi' OR ta_pengajuan_sk.status = 'selesai'`;

  let whereClause = "";

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        whereClause += ` AND ${filter[i]} = '${filterValue[i]}'`;
      }
    } else {
      res
        .status(400)
        .json({ message: "Filter and filterValue must be arrays." });
      return;
    }
  }

  if (search) {
    whereClause += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
  }

  const totalRecordsQuery = `
    SELECT COUNT(DISTINCT ta_pendaftaran_kolokium.id) AS total 
    FROM ta_pendaftaran_kolokium 
    LEFT JOIN ta_pengajuan_sk ON ta_pendaftaran_kolokium.pengajuan_sk_id = ta_pengajuan_sk.id 
    JOIN tb_data_pribadi ON ta_pendaftaran_kolokium.mhs_id = tb_data_pribadi.user_id 
    WHERE ta_pengajuan_sk.deleted_at IS NULL AND ta_pengajuan_sk.status = 'menuju-sidang' OR ta_pengajuan_sk.status = 'menyelesaikan-revisi' OR ta_pengajuan_sk.status = 'selesai'
    ${whereClause}`;

  try {
    const totalRecordsResult = await DB.query(totalRecordsQuery);
    const totalRecords = totalRecordsResult.rows[0].total;

    let query = baseQuery + whereClause;

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
    const rows = result.rows;

    const koloIds = rows.map((row) => row.id);

    let evaluationsQuery = `
      SELECT 
        ta_penilaian_kolokium.kolo_id,
        ta_penilaian_kolokium.dosen_id,
        ta_penilaian_kolokium.peran,
        ta_penilaian_kolokium.penilaian_1,
        ta_penilaian_kolokium.penilaian_2,
        ta_penilaian_kolokium.penilaian_3,
        ta_penilaian_kolokium.penilaian_4,
        ta_penilaian_kolokium.penilaian_5,
        ta_penilaian_kolokium.komentar_singkat,
        ta_penilaian_kolokium.created_at,
        ta_penilaian_kolokium.final_nilai,
        ta_penilaian_kolokium.huruf_mutu
      FROM 
        ta_penilaian_kolokium
      WHERE
        ta_penilaian_kolokium.kolo_id IN (${koloIds.join(",")})
    `;

    const evaluationsResult = await DB.query(evaluationsQuery);
    const evaluationsRows = evaluationsResult.rows;

    // Grouping evaluations by kolo_id
    const evaluationsGrouped = evaluationsRows.reduce((acc, row) => {
      const koloId = row.kolo_id;
      if (!acc[koloId]) {
        acc[koloId] = [];
      }
      acc[koloId].push(row);
      return acc;
    }, {});

    // Merging evaluations with the main data
    const responseData = rows.map((row) => ({
      ...row,
      penilaian_kolokium: evaluationsGrouped[row.id] || [],
    }));

    if (dataTable === "true") {
      res.status(200).json({
        message: "success",
        draw: 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: responseData,
      });
    } else {
      res.status(200).json({
        message: "success",
        data: responseData,
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

exports.exportsRekapPenilainKolokium = asyncHandler(async (req, res) => {
  const baseQuery = `
    SELECT 
      ta_pendaftaran_kolokium.id, 
      ta_pendaftaran_kolokium.mhs_id, 
      ta_pendaftaran_kolokium.kolo_pembimbing_1,
      ta_pendaftaran_kolokium.kolo_pembimbing_2,
      ta_pendaftaran_kolokium.kolo_pembimbing_3,
      ta_pendaftaran_kolokium.evaluator_1,
      ta_pendaftaran_kolokium.evaluator_2,
      ta_pengajuan_sk.deleted_at, 
      ta_pengajuan_sk.id AS sk_id, 
      tb_data_pribadi.user_id, 
      tb_data_pribadi.nama_lengkap, 
      tb_users.user_id,
      tb_users.npm,
      ta_nilai_akhir_kolo.nilai_akhir as nilai_akhir_kolo,
      ta_nilai_akhir_kolo.huruf_mutu as huruf_mutu_akhir_kolo
    FROM 
      ta_pendaftaran_kolokium 
    LEFT JOIN 
      ta_pengajuan_sk ON ta_pendaftaran_kolokium.pengajuan_sk_id = ta_pengajuan_sk.id 
    JOIN 
      ta_nilai_akhir_kolo ON ta_pendaftaran_kolokium.id = ta_nilai_akhir_kolo.kolo_id 
    JOIN 
      tb_data_pribadi ON ta_pendaftaran_kolokium.mhs_id = tb_data_pribadi.user_id 
    JOIN
      tb_users ON ta_pendaftaran_kolokium.mhs_id = tb_users.user_id
    WHERE 
      ta_pengajuan_sk.deleted_at IS NULL AND ta_pengajuan_sk.status = 'menuju-sidang' OR ta_pengajuan_sk.status = 'menyelesaikan-revisi' OR ta_pengajuan_sk.status = 'selesai'
  `;

  try {
    const result = await DB.query(baseQuery);
    const rows = result.rows;

    const koloIds = rows.map((row) => row.id);

    const evaluationsQuery = `
      SELECT 
        ta_penilaian_kolokium.kolo_id,
        ta_penilaian_kolokium.dosen_id,
        ta_penilaian_kolokium.peran,
        ta_penilaian_kolokium.final_nilai
      FROM 
        ta_penilaian_kolokium
      WHERE
        ta_penilaian_kolokium.kolo_id IN (${koloIds.join(",")})
    `;

    const evaluationsResult = await DB.query(evaluationsQuery);
    const evaluationsRows = evaluationsResult.rows;

    // Create a map of dosen_id to nama_lengkap
    const dosenQuery = `
      SELECT 
        user_id, 
        nama_lengkap 
      FROM 
        tb_data_pribadi
      WHERE 
        user_id::text IN (
          SELECT DISTINCT dosen_id::text FROM ta_penilaian_kolokium
          UNION
          SELECT kolo_pembimbing_1::text FROM ta_pendaftaran_kolokium
          UNION
          SELECT kolo_pembimbing_2::text FROM ta_pendaftaran_kolokium
          UNION
          SELECT evaluator_1::text FROM ta_pendaftaran_kolokium
          UNION
          SELECT evaluator_2::text FROM ta_pendaftaran_kolokium
        )
    `;
    const dosenResult = await DB.query(dosenQuery);
    const dosenRows = dosenResult.rows;
    const dosenMap = dosenRows.reduce((acc, dosen) => {
      acc[dosen.user_id] = dosen.nama_lengkap;
      return acc;
    }, {});

    const evaluationsGrouped = evaluationsRows.reduce((acc, row) => {
      const koloId = row.kolo_id;
      if (!acc[koloId]) {
        acc[koloId] = {};
      }
      acc[koloId][row.peran] = row.final_nilai;
      return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Penilaian Kolokium");

    worksheet.columns = [
      { header: "Nama", key: "nama_lengkap", width: 30 },
      { header: "NPM", key: "npm", width: 15 },
      {
        header: "Pembimbing 1",
        key: "final_nilai_pembimbing_1",
        width: 30,
      },
      {
        header: "Pembimbing 2",
        key: "final_nilai_pembimbing_2",
        width: 30,
      },
      {
        header: "Evaluator 1",
        key: "final_nilai_evaluator_1",
        width: 30,
      },
      {
        header: "Evaluator 2",
        key: "final_nilai_evaluator_2",
        width: 30,
      },
      { header: "Nilai Akhir", key: "nilai_akhir_kolo", width: 20 },
    ];

    rows.forEach((row) => {
      const evaluations = evaluationsGrouped[row.id] || {};
      worksheet.addRow({
        nama_lengkap: row.nama_lengkap,
        npm: row.npm,
        final_nilai_pembimbing_1:
          evaluations["pembimbing_1"] ||
          dosenMap[row.kolo_pembimbing_1] ||
          "Belum ada",
        final_nilai_pembimbing_2:
          evaluations["pembimbing_2"] ||
          dosenMap[row.kolo_pembimbing_2] ||
          "Belum ada",
        final_nilai_evaluator_1:
          evaluations["evaluator_1"] ||
          dosenMap[row.evaluator_1] ||
          "Belum ada",
        final_nilai_evaluator_2:
          evaluations["evaluator_2"] ||
          dosenMap[row.evaluator_2] ||
          "Belum ada",
        nilai_akhir_kolo: row.nilai_akhir_kolo,
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=rekap_penilaian_kolokium.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

exports.getRekapPenilaianSidang = asyncHandler(async (req, res) => {
  const {
    filter,
    filterValue,
    dataTable,
    orderField,
    orderValue,
    page,
    perPage,
    search,
  } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;
  const offset = (pageNumber - 1) * itemsPerPage;

  let baseQuery = `
    SELECT 
      ta_pendaftaran_sidang.id, 
      ta_pendaftaran_sidang.mhs_id, 
      ta_pengajuan_sk.deleted_at, 
      ta_pengajuan_sk.id AS sk_id, 
      tb_data_pribadi.user_id, 
      tb_data_pribadi.nama_lengkap, 
      tb_users.user_id,
      tb_users.npm,
      ta_nilai_akhir_sidang.nilai_akhir as nilai_akhir_sidang,
      ta_nilai_akhir_sidang.huruf_mutu as huruf_mutu_akhir_sidang
    FROM 
      ta_pendaftaran_sidang 
    LEFT JOIN 
      ta_pengajuan_sk ON ta_pendaftaran_sidang.pengajuan_sk_id = ta_pengajuan_sk.id 
    JOIN 
      ta_nilai_akhir_sidang ON ta_pendaftaran_sidang.id = ta_nilai_akhir_sidang.sidang_id 
    JOIN 
      tb_data_pribadi ON ta_pendaftaran_sidang.mhs_id = tb_data_pribadi.user_id 
    JOIN
      tb_users ON ta_pendaftaran_sidang.mhs_id = tb_users.user_id
    WHERE 
      ta_pengajuan_sk.deleted_at IS NULL AND ta_pengajuan_sk.status = 'menyelesaikan-revisi' OR  ta_pengajuan_sk.status = 'selesai'`;

  let whereClause = "";

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        whereClause += ` AND ${filter[i]} = '${filterValue[i]}'`;
      }
    } else {
      res
        .status(400)
        .json({ message: "Filter and filterValue must be arrays." });
      return;
    }
  }

  if (search) {
    whereClause += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
  }

  const totalRecordsQuery = `
    SELECT COUNT(DISTINCT ta_pendaftaran_sidang.id) AS total 
    FROM ta_pendaftaran_sidang 
    LEFT JOIN ta_pengajuan_sk ON ta_pendaftaran_sidang.pengajuan_sk_id = ta_pengajuan_sk.id 
    JOIN tb_data_pribadi ON ta_pendaftaran_sidang.mhs_id = tb_data_pribadi.user_id 
    WHERE ta_pengajuan_sk.deleted_at IS NULL AND ta_pengajuan_sk.status = 'menyelesaikan-revisi' OR  ta_pengajuan_sk.status = 'selesai'
    ${whereClause}`;

  try {
    const totalRecordsResult = await DB.query(totalRecordsQuery);
    const totalRecords = totalRecordsResult.rows[0].total;

    let query = baseQuery + whereClause;

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
    const rows = result.rows;

    const sidangIds = rows.map((row) => row.id);

    let evaluationsQuery = `
      SELECT 
        ta_penilaian_sidang.sidang_id,
        ta_penilaian_sidang.dosen_id,
        ta_penilaian_sidang.peran,
        ta_penilaian_sidang.penilaian_1,
        ta_penilaian_sidang.penilaian_2,
        ta_penilaian_sidang.penilaian_3,
        ta_penilaian_sidang.penilaian_4,
        ta_penilaian_sidang.penilaian_5,
        ta_penilaian_sidang.komentar_singkat,
        ta_penilaian_sidang.created_at,
        ta_penilaian_sidang.final_nilai,
        ta_penilaian_sidang.huruf_mutu
      FROM 
        ta_penilaian_sidang
      WHERE
        ta_penilaian_sidang.sidang_id IN (${sidangIds.join(",")})
    `;

    const evaluationsResult = await DB.query(evaluationsQuery);
    const evaluationsRows = evaluationsResult.rows;

    // Grouping evaluations by sidang_id
    const evaluationsGrouped = evaluationsRows.reduce((acc, row) => {
      const sidangId = row.sidang_id;
      if (!acc[sidangId]) {
        acc[sidangId] = [];
      }
      acc[sidangId].push(row);
      return acc;
    }, {});

    // Merging evaluations with the main data
    const responseData = rows.map((row) => ({
      ...row,
      penilaian_sidang: evaluationsGrouped[row.id] || [],
    }));

    if (dataTable === "true") {
      res.status(200).json({
        message: "success",
        draw: 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: responseData,
      });
    } else {
      res.status(200).json({
        message: "success",
        data: responseData,
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

exports.exportRekapPenilaianSidang = asyncHandler(async (req, res) => {
  let baseQuery = `
    SELECT 
      ta_pendaftaran_sidang.id, 
      ta_pendaftaran_sidang.mhs_id, 
      ta_pengajuan_sk.deleted_at, 
      ta_pengajuan_sk.id AS sk_id, 
      tb_data_pribadi.user_id, 
      tb_data_pribadi.nama_lengkap, 
      tb_users.user_id,
      tb_users.npm,
      ta_nilai_akhir_sidang.nilai_akhir as nilai_akhir_sidang,
      ta_nilai_akhir_sidang.huruf_mutu as huruf_mutu_akhir_sidang,
      ta_pendaftaran_sidang.sidang_pembimbing_1,
      ta_pendaftaran_sidang.sidang_pembimbing_2,
      ta_pendaftaran_sidang.penguji_1,
      ta_pendaftaran_sidang.penguji_2
    FROM 
      ta_pendaftaran_sidang 
    LEFT JOIN 
      ta_pengajuan_sk ON ta_pendaftaran_sidang.pengajuan_sk_id = ta_pengajuan_sk.id 
    JOIN 
      ta_nilai_akhir_sidang ON ta_pendaftaran_sidang.id = ta_nilai_akhir_sidang.sidang_id 
    JOIN 
      tb_data_pribadi ON ta_pendaftaran_sidang.mhs_id = tb_data_pribadi.user_id 
    JOIN
      tb_users ON ta_pendaftaran_sidang.mhs_id = tb_users.user_id
    WHERE 
      ta_pengajuan_sk.deleted_at IS NULL AND (ta_pengajuan_sk.status = 'menyelesaikan-revisi' OR ta_pengajuan_sk.status = 'selesai')
  `;

  try {
    const result = await DB.query(baseQuery);
    const rows = result.rows;

    const sidangIds = rows.map((row) => row.id);

    const evaluationsQuery = `
      SELECT 
        ta_penilaian_sidang.sidang_id,
        ta_penilaian_sidang.dosen_id,
        ta_penilaian_sidang.peran,
        ta_penilaian_sidang.final_nilai
      FROM 
        ta_penilaian_sidang
      WHERE
        ta_penilaian_sidang.sidang_id IN (${sidangIds.join(",")})
    `;

    const evaluationsResult = await DB.query(evaluationsQuery);
    const evaluationsRows = evaluationsResult.rows;

    // Create a map of dosen_id to nama_lengkap
    const dosenQuery = `
      SELECT 
        user_id, 
        nama_lengkap 
      FROM 
        tb_data_pribadi
      WHERE 
        user_id::text IN (
          SELECT DISTINCT dosen_id::text FROM ta_penilaian_sidang
          UNION
          SELECT sidang_pembimbing_1::text FROM ta_pendaftaran_sidang
          UNION
          SELECT sidang_pembimbing_2::text FROM ta_pendaftaran_sidang
          UNION
          SELECT penguji_1::text FROM ta_pendaftaran_sidang
          UNION
          SELECT penguji_2::text FROM ta_pendaftaran_sidang
        )
    `;
    const dosenResult = await DB.query(dosenQuery);
    const dosenRows = dosenResult.rows;
    const dosenMap = dosenRows.reduce((acc, dosen) => {
      acc[dosen.user_id] = dosen.nama_lengkap;
      return acc;
    }, {});

    // Group evaluations by sidang_id
    const evaluationsGrouped = evaluationsRows.reduce((acc, row) => {
      const sidangId = row.sidang_id;
      if (!acc[sidangId]) {
        acc[sidangId] = {};
      }
      acc[sidangId][row.peran] = row.final_nilai;
      return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Penilaian Sidang");

    worksheet.columns = [
      { header: "Nama", key: "nama_lengkap", width: 30 },
      { header: "NPM", key: "npm", width: 15 },
      {
        header: "Final Nilai Pembimbing 1",
        key: "final_nilai_pembimbing_1",
        width: 30,
      },
      {
        header: "Final Nilai Pembimbing 2",
        key: "final_nilai_pembimbing_2",
        width: 30,
      },
      {
        header: "Final Nilai Penguji 1",
        key: "final_nilai_penguji_1",
        width: 30,
      },
      {
        header: "Final Nilai Penguji 2",
        key: "final_nilai_penguji_2",
        width: 30,
      },
      { header: "Nilai Akhir Sidang", key: "nilai_akhir_sidang", width: 20 },
    ];

    rows.forEach((row) => {
      const evaluations = evaluationsGrouped[row.id] || {};
      worksheet.addRow({
        nama_lengkap: row.nama_lengkap,
        npm: row.npm,
        final_nilai_pembimbing_1:
          evaluations["pembimbing_1"] ||
          dosenMap[row.sidang_pembimbing_1] ||
          "Belum ada",
        final_nilai_pembimbing_2:
          evaluations["pembimbing_2"] ||
          dosenMap[row.sidang_pembimbing_2] ||
          "Belum ada",
        final_nilai_penguji_1:
          evaluations["penguji_1"] || dosenMap[row.penguji_1] || "Belum ada",
        final_nilai_penguji_2:
          evaluations["penguji_2"] || dosenMap[row.penguji_2] || "Belum ada",
        nilai_akhir_sidang: row.nilai_akhir_sidang,
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=rekap_penilaian_sidang.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});
