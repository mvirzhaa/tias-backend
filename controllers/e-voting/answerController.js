const DB = require("../../database");
const asyncHandler = require("express-async-handler");

exports.getAnswer = asyncHandler(async (req, res) => {
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

  let query = "SELECT * FROM tb_voting_jawaban";

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
    if (Array.isArray(orderField) && Array.isArray(orderValue)) {
      query += " ORDER BY ";
      for (let i = 0; i < orderField.length; i++) {
        query += `${orderField[i]} ${orderValue[i]}`;
        if (i !== orderField.length - 1) {
          query += ",";
        }
      }
    } else {
      res
        .status(400)
        .json({ message: "orderField and orderValue must be arrays." });
      return;
    }
  }

  query += ` LIMIT ${itemsPerPage} OFFSET ${offset}`;

  const result = await DB.query(query);

  let responseData = result.rows;

  if (dataTable === "true") {
    responseData = {
      draw: 1,
      recordsTotal: responseData.length,
      recordsFiltered: responseData.length,
      data: responseData,
    };
  } else {
    responseData = Object.values(responseData);
  }

  res.status(200).json({
    message: "success",
    data: responseData,
  });
});

exports.createAnswer = asyncHandler(async (req, res) => {
  const newData = req.body;

  if (!newData.id_pertanyaan || !newData.jawaban) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  try {
    const saveData = await DB.query(
      "INSERT INTO tb_voting_jawaban(id_pertanyaan, jawaban) VALUES($1, $2) RETURNING *",
      [newData.id_pertanyaan, newData.jawaban]
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

exports.updateAnswer = asyncHandler(async (req, res) => {
  const idToUpdate = req.params.id;
  const updatedData = req.body;

  if (!idToUpdate) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const updateQuery =
      "UPDATE tb_voting_jawaban SET jawaban = $1 WHERE id = $2 RETURNING *";
    const updateValues = [updatedData.jawaban, idToUpdate];

    const updateResult = await DB.query(updateQuery, updateValues);

    if (updateResult.rowCount === 0) {
      res.status(404);
      throw new Error("Data not found for the given ID.");
    }

    res.status(200).json({
      message: "Successfully updated data.",
      data: updateResult.rows[0],
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to update data.",
    });
  }
});

exports.deleteAnswer = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const deleteQuery = "DELETE FROM tb_voting_jawaban WHERE id = $1";
  const deleteResult = await DB.query(deleteQuery, [idToDelete]);

  if (deleteResult.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully deleted data.",
  });
});
