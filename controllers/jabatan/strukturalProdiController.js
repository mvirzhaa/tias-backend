const asyncHandler = require("express-async-handler");
const DB = require("../../database");

exports.tambahStruktural = asyncHandler(async (req, res) => {
  const newData = req.body;

  if (
    !newData.user_id ||
    !newData.nip ||
    !newData.kode_prodi ||
    !newData.id_jabatan
  ) {
    return res.status(400).json({
      message: "Please fill in all the required fields.",
    });
  }

  const findNewData = await DB.query(
    "SELECT * FROM struktural_prodi WHERE nip = $1",
    [newData.nip]
  );

  if (findNewData.rows.length) {
    return res.status(400).json({
      message: "Dosen Sudah Tersedia",
    });
  }

  const saveData = await DB.query(
    "INSERT INTO struktural_prodi(user_id, nip, kode_prodi, id_jabatan, keterangan) VALUES($1, $2, $3, $4, $5)",
    [
      newData.user_id,
      newData.nip,
      newData.kode_prodi,
      newData.id_jabatan,
      newData.keterangan,
    ]
  );

  res.status(200).json({
    message: "Successfully created data",
    data: saveData.rows[0],
  });
});

exports.getStruktural = asyncHandler(async (req, res) => {
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

  let query = `
    SELECT 
      struktural_prodi.*, 
      tb_data_pribadi.user_id, 
      tb_data_pribadi.nama_lengkap, 
      master_jabatan.nama_jabatan 
    FROM 
      struktural_prodi 
      JOIN tb_data_pribadi ON struktural_prodi.user_id = tb_data_pribadi.user_id 
      JOIN master_jabatan ON struktural_prodi.id_jabatan = master_jabatan.id
  `;

  if (search) {
    query += `
      WHERE 
        LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%' OR 
        LOWER(master_jabatan.nama_jabatan) LIKE '%${search.toLowerCase()}%'
    `;
  } else {
    if (filter && filterValue) {
      if (Array.isArray(filter) && Array.isArray(filterValue)) {
        for (let i = 0; i < filter.length; i++) {
          query += ` AND ${filter[i]} = '${filterValue[i]}'`;
        }
      } else {
        res
          .status(400)
          .json({ message: "Filter and filterValue must be arrays." });
        return;
      }
    }
  }

  if (orderField && orderValue) {
    if (typeof orderField === "string" && typeof orderValue === "string") {
      query += `
        ORDER BY 
          ${orderField === "user_id" ? "struktural_prodi." : ""}
          ${orderField} ${orderValue}
      `;
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

  const totalRecordsQuery = "SELECT COUNT(*) AS total FROM struktural_prodi";
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

exports.deleteStruktural = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const deleteQuery = await DB.query(
    "DELETE FROM struktural_prodi WHERE id = $1",
    [idToDelete]
  );

  if (deleteQuery.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully deleted data.",
  });
});

exports.detailStruktural = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB.query(
    "SELECT * FROM struktural_prodi WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    return res.status(400).json({
      message: "Not Found",
    });
  }

  res.status(200).json({
    message: "Successfully get data",
    data: findData.rows[0],
  });
});

exports.editStruktural = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const newData = req.body;

  const findData = await DB.query(
    "SELECT * FROM struktural_prodi WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    return res.status(400).json({
      message: "Not Found",
    });
  }

  const updatedData = await DB.query(
    "UPDATE struktural_prodi SET user_id = $1, nip = $2, kode_prodi = $3, id_jabatan = $4, keterangan =$5 WHERE id = $6 RETURNING *",
    [
      newData.user_id,
      newData.nip,
      newData.kode_prodi,
      newData.id_jabatan,
      newData.keterangan,
      id,
    ]
  );

  res.status(200).json({
    message: "Group updated successfully",
    data: updatedData.rows[0],
  });
});

exports.getJabatanByquery = asyncHandler(async (req, res) => {
  const queryParam = req.query;

  const dataStruktural = await DB.query(
    "SELECT struktural_prodi.*, master_jabatan.* FROM struktural_prodi JOIN master_jabatan ON struktural_prodi.id_jabatan = master_jabatan.id WHERE struktural_prodi.kode_prodi = $1 AND master_jabatan.nama_jabatan = $2",
    [queryParam.prodi, queryParam.nama_jabatan]
  );

  const dataLengkap = await DB.query(
    "SELECT tb_users.*, tb_data_pribadi.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.user_id = $1",
    [dataStruktural.rows[0].user_id]
  );

  const data = {
    ...dataStruktural.rows[0],
    ...dataLengkap.rows[0],
  };

  res.status(200).json({
    message: "Successfully get data",
    data: data,
  });
});
