const DB = require("../../db-evoting");
const asyncHandler = require("express-async-handler");

exports.getActiveQuestion = asyncHandler(async (req, res) => {
  const query = "SELECT * FROM tb_pertanyaan WHERE status_pertanyaan = $1";

  const result = await DB.query(query, [1]);

  res.status(200).json({
    message: "success",
    data: result.rows[0],
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
      "SELECT * FROM tb_jawaban WHERE id_pertanyaan = $1 AND status_jawaban = $2",
      [id, 0]
    );

    const results = await DB.query(
      "SELECT * FROM tb_verifikasi_hasil WHERE id_pertanyaan = $1",
      [id]
    );

    // Inisialisasi objek untuk menyimpan jumlah jawaban
    const counts = {};
    options.rows.forEach((option) => {
      counts[option.jawaban] = 0; // Inisialisasi jumlah jawaban untuk setiap opsi
    });

    // Menghitung jumlah jawaban untuk setiap opsi
    results.rows.forEach((result) => {
      counts[
        options.rows.find((option) => option.id === result.id_jawaban).jawaban
      ]++;
    });

    // Buat struktur data realCount
    const realCount = {
      label: Object.keys(counts),
      data: Object.values(counts),
    };

    const questionOptions = options.rows.map((option) => ({
      ...option,
      jmlSuara: results.rows.filter((result) => result.id_jawaban === option.id)
        .length,
    }));

    const response = {
      message: "success",
      data: {
        pertanyaan: question.rows[0],
        option: questionOptions,
        realCount: realCount,
        hasil: results.rows,
        jmlSuara: results.rowCount,
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

  if (!newData.deskripsi || !newData.jawaban || !newData.jawaban.length) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  try {
    const saveData = await DB.query(
      "INSERT INTO tb_pertanyaan(deskripsi) VALUES($1) RETURNING *",
      [newData.deskripsi]
    );

    const pertanyaan_id = saveData.rows[0].id;

    const saveDataJawabanPromises = newData.jawaban.map(async (jawaban) => {
      return await DB.query(
        "INSERT INTO tb_jawaban(id_pertanyaan, jawaban) VALUES($1, $2) RETURNING *",
        [pertanyaan_id, jawaban]
      );
    });

    const saveDataJawabanResults = await Promise.all(saveDataJawabanPromises);

    res.status(200).json({
      message: "Successfully created data.",
      data: saveData.rows[0],
      jawaban: saveDataJawabanResults.map((result) => result.rows[0]),
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to create data.",
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
      await DB.query("DELETE FROM tb_jawaban WHERE id_pertanyaan = $1", [
        idToUpdate,
      ]);

      dataToUpdate.dataOptions.forEach(async (opt) => {
        // Mengakses langsung properti dataOptions
        const dataOptions = {
          id_pertanyaan: opt.id_pertanyaan,
          jawaban: opt.jawaban,
          status_jawaban: opt.status_jawaban,
        };

        await DB.query(
          "INSERT INTO tb_jawaban(id_pertanyaan, jawaban, status_jawaban) VALUES ($1, $2, $3) RETURNING *",
          [
            dataOptions.id_pertanyaan,
            dataOptions.jawaban,
            dataOptions.status_jawaban,
          ]
        );
      });
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
