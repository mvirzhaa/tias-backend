const asyncHandler = require("express-async-handler");
const DB = require("../../database");

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
  ta_pendaftaran_kolokium.kolo_pembimbing_1,
  ta_pendaftaran_kolokium.kolo_pembimbing_2,
  ta_pendaftaran_kolokium.kolo_pembimbing_3,
  ta_pendaftaran_kolokium.pengajuan_sk_id,
  tb_data_pribadi.nama_lengkap, 
  tb_users.npm,
  CASE 
      WHEN ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' THEN 'SK Pembimbing 1'
      WHEN ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' THEN 'SK Pembimbing 2'
      WHEN ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' THEN 'SK Pembimbing 3'
      WHEN ta_pengajuan_sk.kepala_lab = '${userLoginId}' THEN 'Kepala Lab'
      ELSE ''
  END || 
  CASE 
      WHEN ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' THEN 
          CASE WHEN 
              ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' 
          THEN 
              ' & Pembimbing Kolokium 1' 
          ELSE 
              'Pembimbing Kolokium 1' 
          END
      WHEN ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' THEN 
          CASE WHEN 
              ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' 
          THEN 
              ' & Pembimbing Kolokium 2' 
          ELSE 
              'Pembimbing Kolokium 2' 
          END
      WHEN ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' THEN 
          CASE WHEN 
              ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' 
          THEN 
              ' & Pembimbing Kolokium 3' 
          ELSE 
              'Pembimbing Kolokium 3' 
          END
      ELSE ''
  END AS peran 
FROM  
  ta_pengajuan_sk 
JOIN 
  tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id 
JOIN 
  tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id 
JOIN 
  ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id  
WHERE 
  ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR 
  ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR 
  ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR 
  ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR 
  ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR 
  ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR 
  ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}'
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
    `UPDATE ${db} SET ${setQuery} WHERE id = $1`,
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
    res.status(400);
    throw new Error("Please fill in all the required fields.");
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
