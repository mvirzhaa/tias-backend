const DB = require("../../db-evoting");
const asyncHandler = require("express-async-handler");

exports.getActiveQuestion = asyncHandler(async (req, res) => {
  const query = "SELECT * FROM tb_pertanyaan WHERE status_pertanyaan = $1";

  const result = await DB.query(query, [1]);

  res.status(200).json({
    message: "success",
    data: result.rows,
  });
});

exports.getQuestion = asyncHandler(async (req, res) => {
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

  let query = "SELECT * FROM tb_pertanyaan";

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

exports.detailQuestion = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const question = await DB.query(
      "SELECT * FROM tb_pertanyaan WHERE id = $1",
      [id]
    );
    const options = await DB.query(
      "SELECT tb_jawaban.*, tb_hasil.* FROM tb_jawaban JOIN tb_hasil ON tb_jawaban.id = tb_hasil.id_jawaban WHERE tb_jawaban.id_pertanyaan = $1 AND tb_jawaban.status_jawaban = $2",
      [id, 1]
    );

    const findJmlSuara = await DB.query(
      "SELECT * FROM tb_verifikasi_hasil WHERE id_pertanyaan = $1",
      [id]
    );

    const label = [];
    const data = [];

    options.rows.forEach((option) => {
      label.push(option.jawaban);
      data.push(option.hasil);
    });

    const dataChart = {
      label: label,
      data: data,
    };

    const response = {
      message: "success",
      data: {
        pertanyaan: question.rows[0],
        option: options.rows,
        realCount: dataChart,
        jmlSuara: findJmlSuara.rowCount,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      message: "error",
      error: error.message,
    });
  }
});

exports.detailForEditQuestion = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const question = await DB.query(
      "SELECT * FROM tb_pertanyaan WHERE id = $1",
      [id]
    );
    const options = await DB.query(
      "SELECT * FROM tb_jawaban WHERE id_pertanyaan = $1",
      [id]
    );

    res.status(200).json({
      message: "success",
      data: {
        dataPertanyaan: question.rows,
        dataOptions: options.rows,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "error",
      error: error.message,
    });
  }
});

exports.createQuestion = asyncHandler(async (req, res) => {
  const newData = req.body;

  if (!newData.deskripsi || !newData.jawaban || newData.jawaban.length === 0) {
    return res.status(400).json({
      message: "Please fill in all the required fields.",
    });
  }

  try {
    const saveData = await DB.query(
      "INSERT INTO tb_pertanyaan(deskripsi) VALUES($1) RETURNING *",
      [newData.deskripsi]
    );

    const pertanyaan_id = saveData.rows[0].id;

    const saveDataJawabanPromises = newData.jawaban.map(async (jawaban) => {
      const saveJawaban = await DB.query(
        "INSERT INTO tb_jawaban(id_pertanyaan, jawaban) VALUES($1, $2) RETURNING *",
        [pertanyaan_id, jawaban]
      );

      const jawabanId = saveJawaban.rows[0].id;

      const saveDataHasil = await DB.query(
        "INSERT INTO tb_hasil(id_jawaban) VALUES ($1) RETURNING *",
        [jawabanId]
      );

      return saveDataHasil.rows[0];
    });

    const saveDataJawabanResults = await Promise.all(saveDataJawabanPromises);

    res.status(200).json({
      message: "Successfully created data.",
      data: saveData.rows[0],
      jawaban: saveDataJawabanResults,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({
      message: "Failed to create data.",
    });
  }
});

exports.updateQuestion = asyncHandler(async (req, res) => {
  const idToUpdate = req.params.id;
  const dataToUpdate = req.body;

  if (!idToUpdate) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const dataAnswer = {
      deskripsi: dataToUpdate.deskripsi,
      status_pertanyaan: dataToUpdate.status_pertanyaan,
    };

    const updateQuery =
      "UPDATE tb_pertanyaan SET deskripsi = $1, status_pertanyaan = $2 WHERE id = $3 RETURNING *";
    const updateValues = [
      dataAnswer.deskripsi,
      dataAnswer.status_pertanyaan,
      idToUpdate,
    ];
    await DB.query(updateQuery, updateValues);

    if (dataToUpdate.dataOptions) {
      for (const opt of dataToUpdate.dataOptions) {
        if (opt.id) {
          await DB.query(
            "UPDATE tb_jawaban SET jawaban = $1, status_jawaban = $2 WHERE id = $3",
            [opt.jawaban, opt.status_jawaban, opt.id]
          );
        } else {
          const insertedJawaban = await DB.query(
            "INSERT INTO tb_jawaban(id_pertanyaan, jawaban, status_jawaban) VALUES ($1, $2, $3) RETURNING id",
            [idToUpdate, opt.jawaban, opt.status_jawaban]
          );
          const newJawabanId = insertedJawaban.rows[0].id;

          await DB.query(
            "INSERT INTO tb_hasil(id_jawaban) VALUES ($1) RETURNING *",
            [newJawabanId]
          );
        }
      }
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

exports.deleteQuestion = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  await DB.query("DELETE FROM tb_jawaban WHERE id_pertanyaan = $1", [
    idToDelete,
  ]);

  const deleteQuery = "DELETE FROM tb_pertanyaan WHERE id = $1 RETURNING *";
  const deleteResult = await DB.query(deleteQuery, [idToDelete]);

  if (deleteResult.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully deleted data.",
  });
});
