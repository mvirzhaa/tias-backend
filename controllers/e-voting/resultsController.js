const DB_TIAS = require("../../database");
const asyncHandler = require("express-async-handler");
const md5 = require("md5");
const GroupVoting = require("../../models/master/group/GroupVoting");
const GroupUsers = require("../../models/master/group/GroupUsers");
const { Op } = require("sequelize");

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

  const posisiPenyisipan = Math.floor(panjangHashMd5 / 2);

  let hasil = "";

  for (let i = 0; i < panjangHashMd5; i++) {
    if (i === posisiPenyisipan) {
      hasil += hashIdAnswer;
    }
    hasil += hashMd5[i];
  }

  if (panjangHashMd5 < panjangHashIdAnswer) {
    hasil += hashIdAnswer.slice(panjangHashMd5);
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
    const findVotingGroup = await GroupVoting.findAll({
      where: {
        id_voting: newData.id_pertanyaan,
      },
    });

    if (findVotingGroup) {
      const groupIds = findVotingGroup.map((data) => data.id_group);
      const findUserGroup = await GroupUsers.findAll({
        where: {
          id_user: userLoginId,
          id_group: {
            [Op.in]: groupIds,
          },
        },
      });

      if (!findUserGroup) {
        return res
          .status(400)
          .json({ message: "You don't have access answered this question." });
      }
    }

    const findQuestion = await DB_TIAS.query(
      "SELECT * FROM tb_voting_pertanyaan WHERE id = $1 and status_pertanyaan = $2",
      [newData.id_pertanyaan, 0]
    );

    const findAnswer = await DB_TIAS.query(
      "SELECT * FROM tb_voting_jawaban WHERE id = $1 and status_jawaban = $2",
      [newData.id_jawaban, 0]
    );

    if (findQuestion.rows.length || findAnswer.rows.length) {
      res.status(400);
      throw new Error("Voting is no longer active.");
    }

    const hasAnswered = await DB_TIAS.query(
      "SELECT * FROM tb_voting_verifikasi_hasil WHERE id_pertanyaan = $1 AND user_id = $2",
      [newData.id_pertanyaan, userLoginId]
    );

    if (hasAnswered.rows.length) {
      return res
        .status(400)
        .json({ message: "You have already answered this question." });
    }

    await DB_TIAS.query(
      "UPDATE tb_voting_hasil SET hasil = hasil + 1 WHERE id_jawaban = $1",
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

    const saveVerifikasi = await DB_TIAS.query(
      "INSERT INTO tb_voting_verifikasi_hasil(id_pertanyaan, user_id, cek_sum) VALUES($1, $2, $3) RETURNING *",
      [newData.id_pertanyaan, userLoginId, readyCekSum]
    );

    res.status(200).json({
      message: "Success",
      data: saveVerifikasi.rows[0].cek_sum,
    });
  } catch (error) {
    console.log(error);

    res.status(400).json({
      message: error.message || "Failed to create data.",
    });
  }
});

async function extractIdAnswer(combinedHash) {
  const panjangHashMd5 = 32;
  const panjangHashIdAnswer = combinedHash.length - panjangHashMd5;
  const posisiAwalHashIdAnswer = Math.floor(panjangHashMd5 / 2);

  const hashIdAnswer = combinedHash.substring(
    posisiAwalHashIdAnswer,
    posisiAwalHashIdAnswer + panjangHashIdAnswer
  );

  return hashIdAnswer;
}

async function LetterToNumber(huruf) {
  let angka = "";
  for (let i = 0; i < huruf.length; i++) {
    const index = alphabet.indexOf(huruf[i].toUpperCase());
    if (index !== -1) {
      angka = index.toString() + angka;
    }
  }
  return angka;
}

exports.cekSum = asyncHandler(async (req, res) => {
  const code = req.query.code;

  try {
    const id_jawaban = await extractIdAnswer(code);

    const angkaIdJawaban = await LetterToNumber(id_jawaban);

    const id = parseInt(angkaIdJawaban);

    const findJawaban = await DB_TIAS.query(
      "SELECT * FROM tb_voting_jawaban WHERE id = $1",
      [id]
    );

    res.status(200).json({
      message: "success",
      suara: findJawaban.rows[0].jawaban,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: error.message || "Failed to decrypt data.",
    });
  }
});
