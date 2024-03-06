const DB = require("../../db-evoting");
const DB_TIAS = require("../../database");
const asyncHandler = require("express-async-handler");
const md5 = require("md5");

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

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
async function NumberToLetter(angka) {
  let huruf = "";
  for (let i = angka.length - 1; i >= 0; i--) {
    if (angka[i]) {
      huruf += alphabet[parseInt(angka[i])];
    }
  }
  return huruf;
}

async function combineValue(hashMd5, hashIdAnswer) {
  const panjangHashMd5 = hashMd5.length;
  const panjangHashIdAnswer = hashIdAnswer.length;

  const jumlahSisipan = Math.floor(panjangHashMd5 / panjangHashIdAnswer);

  let hasil = "";
  let counterHashId = 0;

  for (let i = 0; i < panjangHashMd5; i++) {
    hasil += hashMd5[i];
    if ((i + 1) % jumlahSisipan === 0 && counterHashId < panjangHashIdAnswer) {
      hasil += hashIdAnswer[counterHashId];
      counterHashId++;
    }
  }

  if (counterHashId < panjangHashIdAnswer) {
    hasil += hashIdAnswer.slice(counterHashId);
  }

  return hasil;
}

exports.createResult = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const role = req.user.role;

  const newData = req.body;

  if (role === "Admin") {
    return res
      .status(400)
      .json({ message: "Not Authorized as an Dosen/Mahasiswa." });
  }

  if (
    !newData.id_pertanyaan ||
    !newData.id_jawaban ||
    isNaN(newData.id_pertanyaan) ||
    isNaN(newData.id_jawaban)
  ) {
    return res
      .status(400)
      .json({ message: "Please provide valid question and answer IDs." });
  }

  try {
    const findQuestion = await DB.query(
      "SELECT * FROM tb_pertanyaan WHERE id = $1 and status_pertanyaan = $2",
      [newData.id_pertanyaan, 0]
    );

    const findAnswer = await DB.query(
      "SELECT * FROM tb_jawaban WHERE id = $1 and status_jawaban = $2",
      [newData.id_jawaban, 0]
    );

    if (findQuestion.rows.length || findAnswer.rows.length) {
      res.status(400);
      throw new Error("Voting is no longer active.");
    }

    const hasAnswered = await DB.query(
      "SELECT * FROM tb_verifikasi_hasil WHERE id_pertanyaan = $1 AND user_id = $2",
      [newData.id_pertanyaan, userLoginId]
    );

    if (hasAnswered.rows.length) {
      return res
        .status(400)
        .json({ message: "You have already answered this question." });
    }

    await DB.query(
      "UPDATE tb_hasil SET hasil = hasil + 1 WHERE id_jawaban = $1",
      [newData.id_jawaban]
    );

    const findNIp = await DB_TIAS.query(
      "SELECT nip FROM tb_data_pribadi WHERE user_id = $1",
      [userLoginId]
    );

    const cek_sum =
      role === "Mahasiswa"
        ? `${req.user.npm.toString()}${newData.id_jawaban}`
        : role === "Dosen"
        ? `${findNIp.rows[0].nip.toString().replace(/\s/g, "")}${
            newData.id_jawaban
          }`
        : null;

    const hashMd5 = md5(cek_sum);
    const hashIdAnswer = await NumberToLetter(newData.id_jawaban);

    const readyCekSum = await combineValue(hashMd5, hashIdAnswer);

    const saveVerifikasi = await DB.query(
      "INSERT INTO tb_verifikasi_hasil(id_pertanyaan, user_id, cek_sum) VALUES($1, $2, $3) RETURNING *",
      [newData.id_pertanyaan, userLoginId, readyCekSum]
    );

    res.status(200).json({
      message: "Successfully created data.",
      data: saveVerifikasi.rows[0],
    });
  } catch (error) {
    console.log(error);

    res.status(400).json({
      message: error.message || "Failed to create data.",
    });
  }
});
