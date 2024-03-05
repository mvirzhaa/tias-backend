const DB = require("../../db-evoting");
const asyncHandler = require("express-async-handler");

exports.getResults = asyncHandler(async (req, res) => {
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

  let query = "SELECT * FROM tb_verifikasi_hasil";

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

exports.createResult = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const newData = req.body;

  if (!newData.id_pertanyaan || !newData.id_jawaban) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  const findQuestion = await DB.query(
    "SELECT * FROM tb_pertanyaan WHERE id = $1 and status_pertanyaan = $2",
    [newData.id_pertanyaan, 0]
  );

  if (findQuestion.rows.length) {
    res.status(400);
    throw new Error("Voting is no longer active.");
  }

  const findData = await DB.query(
    "SELECT * FROM tb_verifikasi_hasil WHERE id_pertanyaan = $1 AND user_id = $2",
    [newData.id_pertanyaan, userLoginId]
  );

  if (findData.rows.length) {
    res.status(400);
    throw new Error("Already answer.");
  }

  try {
    const saveData = await DB.query(
      "INSERT INTO tb_verifikasi_hasil(id_pertanyaan, id_jawaban, user_id) VALUES($1, $2, $3) RETURNING *",
      [newData.id_pertanyaan, newData.id_jawaban, userLoginId]
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
