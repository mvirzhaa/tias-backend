const DB = require("../../db-evoting");
const asyncHandler = require("express-async-handler");

exports.getGroupVoting = asyncHandler(async (req, res) => {
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

  let query = "SELECT * FROM tb_group";

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

  const totalRecordsQuery = "SELECT COUNT(*) AS total FROM tb_pertanyaan";
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

exports.createGroup = asyncHandler(async (req, res) => {
  const newData = req.body;

  if (!newData.nama_group) {
    return res.status(400).json({
      message: "Please fill in all the required fields.",
    });
  }

  const findNewData = await DB.query(
    "SELECT * FROM tb_group WHERE nama_group = $1",
    [newData.nama_group]
  );

  if (findNewData.rows.length) {
    return res.status(400).json({
      message: "Name of group already exists.",
    });
  }

  const saveData = await DB.query(
    "INSERT INTO tb_group(nama_group) VALUES($1)",
    [newData.nama_group]
  );

  res.status(200).json({
    message: "Successfully created data",
    data: saveData.rows[0],
  });
});

exports.deleteGroup = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const deleteQuery = await DB.query("DELETE FROM tb_group WHERE id = $1", [
    idToDelete,
  ]);

  if (deleteQuery.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully deleted data.",
  });
});

exports.detailGroup = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB.query("SELECT * FROM tb_group WHERE id = $1", [id]);

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

exports.editGroup = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB.query("SELECT * FROM tb_group WHERE id = $1", [id]);

  if (!findData.rows.length) {
    return res.status(400).json({
      message: "Not Found",
    });
  }

  const { nama_group } = req.body;

  const updatedData = await DB.query(
    "UPDATE tb_group SET nama_group = $1 WHERE id = $2 RETURNING *",
    [nama_group, id]
  );

  res.status(200).json({
    message: "Group updated successfully",
    data: updatedData.rows[0],
  });
});
