const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

exports.addDataKepangkatan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  if (user.rows.length) {
    const file = req.files;
    const data = req.body;

    if (Object.keys(file).length === 0) {
      res.status(400);
      throw new Error("Please fill in one file.");
    }

    if (
      !data.gol_pangkat ||
      !data.nomor_sk ||
      !data.tgl_sk ||
      !data.tgl_mulai
    ) {
      fs.unlink(file.file_kepangkatan[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }

    const existsGolPangkat = await DB.query(
      `SELECT * FROM tb_kepangkatan_dosen WHERE CAST(user_id AS TEXT) LIKE '%${user.rows[0].user_id}%' AND gol_pangkat LIKE '%${data.gol_pangkat}%'`
    );

    if (existsGolPangkat.rows.length) {
      fs.unlink(file.file_kepangkatan[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Golongan/Pangkat already exists.");
    }

    const existsNomerSK = await DB.query(
      "SELECT * FROM tb_kepangkatan_dosen WHERE nomor_sk = $1",
      [data.nomor_sk]
    );

    if (existsNomerSK.rows.length) {
      fs.unlink(file.file_kepangkatan[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("SK number already exists.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(data), "file", "created_at"];
    const values = [
      userLoginId,
      ...Object.values(data),
      file.file_kepangkatan[0].filename,
      convert,
    ];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveData = await DB.query(
      `INSERT INTO tb_kepangkatan_dosen(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    if (saveData.rows) {
      res.status(200).json({
        message: "Successfull created data.",
        data: saveData.rows[0],
      });
    } else {
      res.status(400);
      throw new Error("Invalid data.");
    }
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

exports.getDataKepangkatan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const dataKepangkatan = await DB.query(
    "SELECT * FROM tb_kepangkatan_dosen WHERE user_id = $1 and is_deleted = $2",
    [userLoginId, false]
  );

  res.status(201).json({
    data: dataKepangkatan.rows,
  });
});

exports.detailDataKepangkatan = asyncHandler(async (req, res) => {
  const { pangkatId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_kepangkatan_dosen WHERE pangkat_id = $1",
    [pangkatId]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.editDataKepangkatan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const { pangkatId } = req.params;

  const dataPangkat = await DB.query(
    "SELECT * FROM tb_kepangkatan_dosen WHERE pangkat_id = $1",
    [pangkatId]
  );

  if (dataPangkat.rows.length) {
    const file = req.files;

    if (Object.keys(file).length === 0) {
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const statusValue =
        dataPangkat.rows[0].status === 2 ? 0 : dataPangkat.rows[0].status;

      const entries = Object.entries({
        ...req.body,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");
      const saveData = await DB.query(
        `UPDATE tb_kepangkatan_dosen SET ${setQuery} WHERE pangkat_id = '${dataPangkat.rows[0].pangkat_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully updated data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/file-kepangkatan/${dataPangkat.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const statusValue =
        dataPangkat.rows[0].status === 2 ? 0 : dataPangkat.rows[0].status;

      const entries = Object.entries({
        ...req.body,
        file: file.file_kepangkatan[0].filename,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE tb_kepangkatan_dosen SET ${setQuery} WHERE pangkat_id = '${dataPangkat.rows[0].pangkat_id}'  `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully updated data.",
        data: saveData.rows[0],
      });
    }
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.deleteDataKepangkatan = asyncHandler(async (req, res) => {
  const { pangkatId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_kepangkatan_dosen WHERE pangkat_id = $1",
    [pangkatId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  await DB.query(
    "UPDATE tb_kepangkatan_dosen SET is_deleted = $1, deleted_at = $2 WHERE pangkat_id = $3 returning *",
    [true, convert, pangkatId]
  );

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.approveStatusKepangkatan = asyncHandler(async (req, res) => {
  const { pangkatId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_kepangkatan_dosen WHERE pangkat_id = $1",
    [pangkatId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_kepangkatan_dosen SET status = $1, updated_at = $2 WHERE pangkat_id = $3 returning *`,
      [1, convert, pangkatId]
    );

    res.status(201).json({
      message: "Data has been received.",
      data: updateStatus.rows[0],
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusKepangkatan = asyncHandler(async (req, res) => {
  const { pangkatId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_kepangkatan_dosen WHERE pangkat_id = $1",
    [pangkatId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_kepangkatan_dosen SET status = $1, updated_at = $2 WHERE pangkat_id = $3 returning *`,
      [2, convert, pangkatId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
      data: updateStatus.rows[0],
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});
