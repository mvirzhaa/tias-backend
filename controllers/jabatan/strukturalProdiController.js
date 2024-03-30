const asyncHandler = require("express-async-handler");
const DB = require("../../database");

exports.tambahJabatan = asyncHandler(async (req, res) => {
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
    "SELECT * FROM master_jabatan WHERE nip = $1",
    [newData.nip]
  );

  if (findNewData.rows.length) {
    return res.status(400).json({
      message: "Dosen Sudah Tersedia",
    });
  }

  const saveData = await DB.query(
    "INSERT INTO struktural_prodi(user_id, nip, kode_prodi, id_jabatan) VALUES($1, $2, $3, $4)",
    [newData.user_id, newData.nip, newData.kode_prodi, newData.id_jabatan]
  );

  res.status(200).json({
    message: "Successfully created data",
    data: saveData.rows[0],
  });
});

exports.getJabatan = asyncHandler(async (req, res) => {
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

  let query = "SELECT * FROM master_jabatan";

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

  const totalRecordsQuery = "SELECT COUNT(*) AS total FROM master_jabatan";
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

exports.deleteJabatan = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const deleteQuery = await DB.query(
    "DELETE FROM master_jabatan WHERE id = $1",
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

exports.detailJabatan = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB.query(
    "SELECT * FROM master_jabatan WHERE id = $1",
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

exports.editJabatan = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB.query(
    "SELECT * FROM master_jabatan WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    return res.status(400).json({
      message: "Not Found",
    });
  }

  const { nama_jabatan } = req.body;

  const updatedData = await DB.query(
    "UPDATE master_jabatan SET nama_jabatan = $1 WHERE id = $2 RETURNING *",
    [nama_jabatan, id]
  );

  res.status(200).json({
    message: "Group updated successfully",
    data: updatedData.rows[0],
  });
});
