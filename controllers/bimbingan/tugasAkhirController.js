const asyncHandler = require("express-async-handler");
const DB = require("../../database");

exports.pengajuanSk = asyncHandler(async (req, res) => {
  const data = req.body;
  const userLoginId = req.user.user_id;

  if (
    !data.judul_skripsi ||
    !data.lokasi_kegiatan ||
    !data.semester ||
    !data.pembimbing_1 ||
    !data.pembimbing_2 ||
    !data.kepala_lab
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  if (
    data.pembimbing_1 === data.pembimbing_2 ||
    data.pembimbing_1 === data.pembimbing_3 ||
    data.pembimbing_2 === data.pembimbing_3
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

  const query = "SELECT * FROM ta_pengajuan_sk WHERE mhs_id = $1";

  const result = await DB.query(query, [userLoginId]);

  res.status(200).json({
    message: "success",
    data: result.rows,
    totalData: result.rowCount,
  });
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
    "SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id";

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

  let responseData = result.rows;

  const totalRecordsQuery = "SELECT COUNT(*) AS total FROM ta_pengajuan_sk";
  const totalRecordsResult = await DB.query(totalRecordsQuery);
  const totalRecords = totalRecordsResult.rows[0].total;

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
  tb_data_pribadi.nama_lengkap, 
  tb_users.npm,
  CASE 
      WHEN ta_pengajuan_sk.pembimbing_1 = '${userLoginId}' THEN 'pembimbing_1'
      WHEN ta_pengajuan_sk.pembimbing_2 = '${userLoginId}' THEN 'pembimbing_2'
      WHEN ta_pengajuan_sk.pembimbing_3 = '${userLoginId}' THEN 'pembimbing_3'
      WHEN ta_pengajuan_sk.kepala_lab = '${userLoginId}' THEN 'kepala_lab'
      ELSE NULL 
  END AS peran 
FROM  ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.pembimbing_1 = '${userLoginId}' OR ta_pengajuan_sk.pembimbing_2 = '${userLoginId}' OR ta_pengajuan_sk.pembimbing_3 = '${userLoginId}' OR ta_pengajuan_sk.kepala_lab = '${userLoginId}' `;

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

  let responseData = result.rows;

  const totalRecordsQuery = "SELECT COUNT(*) AS total FROM ta_pengajuan_sk";
  const totalRecordsResult = await DB.query(totalRecordsQuery);
  const totalRecords = totalRecordsResult.rows[0].total;

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
});

exports.detailPengajuanSk = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_users.npm FROM ta_pengajuan_sk JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id WHERE ta_pengajuan_sk.id = ${id}`;

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

  let query = `SELECT ta_pengajuan_sk.*, tb_data_pribadi.nama_lengkap, tb_users.npm 
  FROM ta_pengajuan_sk 
  JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id 
  JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id 
  WHERE (ta_pengajuan_sk.pembimbing_1 = '${userLoginId}' 
         OR ta_pengajuan_sk.pembimbing_2 = '${userLoginId}' 
         OR ta_pengajuan_sk.pembimbing_3 = '${userLoginId}' 
         OR ta_pengajuan_sk.kepala_lab = '${userLoginId}') 
         AND ta_pengajuan_sk.id = ${id}`;

  const findData = await DB.query(query);

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  let statusDosen = 0;
  let isKepalaLab = false;

  if (findData.rows[0].pembimbing_1 == userLoginId) {
    statusDosen = 1;
  } else if (findData.rows[0].pembimbing_2 == userLoginId) {
    statusDosen = 2;
  } else if (findData.rows[0].pembimbing_3 == userLoginId) {
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
  const data = req.body;

  const findData = await DB.query(
    "SELECT * FROM ta_pengajuan_sk WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  const entries = Object.entries({ ...data });
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  const saveData = await DB.query(
    `UPDATE ta_pengajuan_sk SET ${setQuery} WHERE id = '${id}' `,
    entries.map(([_, value]) => value)
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

  if (findData.rows[0].pembimbing_1 && !findData.rows[0].status_pem_1) {
    res.status(400);
    throw new Error("Status pembimbing 1 belum acc.");
  }
  if (findData.rows[0].pembimbing_2 && !findData.rows[0].status_pem_2) {
    res.status(400);
    throw new Error("Status pembimbing 2 belum acc.");
  }
  if (findData.rows[0].pembimbing_3 && !findData.rows[0].status_pem_3) {
    res.status(400);
    throw new Error("Status pembimbing 3 belum acc.");
  }
  if (!findData.rows[0].status_kepala_lab) {
    res.status(400);
    throw new Error("Status kepala lab belum acc.");
  }
  const status = "menuju-kolokium";
  const updateData = await DB.query(
    `UPDATE ta_pengajuan_sk 
     SET nomor_sk = $1, tgl_sk = $2, link_dokumen_sk = $3, status = $4
     WHERE id = $5`,
    [nomor_sk, tgl_sk, link_dokumen_sk, status, id]
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateData.rows[0],
  });
});
