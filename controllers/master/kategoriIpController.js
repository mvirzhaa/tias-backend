const asyncHandler = require("express-async-handler");
const DB = require("../../database");

exports.getKategoriIp = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const data = await DB.query("SELECT * FROM kategori_ip ORDER BY point ASC LIMIT $1 OFFSET $2", [limit, offset]);

  const totalDataQuery = await DB.query("SELECT COUNT(*) FROM kategori_ip");
  const totalData = totalDataQuery.rows[0].count;

  res.status(201).json({
    data: data.rows,
    totalData
  });
});


async function validateUnique(db, column, value, fieldName) {
  const result = await DB.query(
    column === 'point' 
      ? `SELECT * FROM ${db} WHERE ${column} = $1`
      : `SELECT * FROM ${db} WHERE UPPER(${column}) = UPPER($1)`,
    [value]
  );

  if (result.rows.length > 0) {
    throw new Error(`${fieldName} is already exists.`);
  }
}

exports.createDataKategoriIp = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data.kode || !data.kategori || !data.point) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  try {
    await validateUnique("kategori_ip", "kode", data.kode, "Kode");
    await validateUnique("kategori_ip", "kategori", data.kategori, "Name of Category");
    await validateUnique("kategori_ip", "point", data.point, "Point");

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    const saveData = await DB.query(
      `INSERT INTO kategori_ip(${keys.join(", ")}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    res.status(200).json({
      message: "Successfully created data.",
      data: saveData.rows[0],
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to create data.",
    });
  }
});

exports.deleteDataByIdIp = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const deleteQuery = "DELETE FROM kategori_ip WHERE id = $1";
  const deleteResult = await DB.query(deleteQuery, [idToDelete]);

  if (deleteResult.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully deleted data.",
  });
});

exports.getDataByIdIp = asyncHandler(async (req, res) => {
  const idToRetrieve = req.params.id;

  if (!idToRetrieve) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const selectQuery = "SELECT * FROM kategori_ip WHERE id = $1";
  const selectResult = await DB.query(selectQuery, [idToRetrieve]);

  if (selectResult.rows.length === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully retrieved data.",
    data: selectResult.rows[0],
  });
});

exports.editDataByIdIp = asyncHandler(async (req, res) => {
  const idToUpdate = req.params.id;
  const updatedData = req.body;


  if (!idToUpdate) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const updateQuery = "UPDATE kategori_ip SET kode = $1, kategori = $2, point = $3 WHERE id = $4";
    const updateValues = [updatedData.kode, updatedData.kategori, updatedData.point, idToUpdate];
  
    const updateResult = await DB.query(updateQuery, updateValues);
  
    if (updateResult.rowCount === 0) {
      res.status(404);
      throw new Error("Data not found for the given ID.");
    }
  
    res.status(200).json({
      message: "Successfully updated data.",
    });
  } catch (error) {
      res.status(400).json({
      message: error.message || "Failed to update data.",
    });
  }
});