const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");

exports.addRekomendasi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  if (!data.body || !data.mahasiswa_id) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  if (user.rows.length) {
    const findMhs = await DB.query(
      "SELECT * FROM tb_users WHERE user_id = $1 and role = $2",
      [data.mahasiswa_id, "Mahasiswa"]
    );

    if (!findMhs.rows.length) {
      res.status(404);
      throw new Error("Student not found.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(data), "created_at"];
    const values = [userLoginId, ...Object.values(data), convert];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveData = await DB.query(
      `INSERT INTO rekomendasi_mhs(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    if (saveData.rows) {
      const jumlahDataRekomen = await DB.query(
        "SELECT COUNT(*) FROM rekomendasi_mhs WHERE mahasiswa_id = $1",
        [data.mahasiswa_id]
      );

      const totalData = jumlahDataRekomen.rows[0].count * 100;

      await DB.query(
        "UPDATE tb_data_pribadi SET point_rekomendasi = $1 WHERE user_id = $2",
        [totalData, data.mahasiswa_id]
      );

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

exports.editRekomendasi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;

  const findData = await DB.query(
    "SELECT * FROM rekomendasi_mhs WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Rekomendasi Not Found!");
  }

  await DB.query("UPDATE rekomendasi_mhs SET body = $1 WHERE id = $2", [
    body,
    id,
  ]);

  res.status(201).json({
    message: "Successfully update data.",
  });
});

exports.getRekomendasiByUserLogin = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const query = await DB.query(
    `SELECT rekomendasi_mhs.id, rekomendasi_mhs.body as text_rekomendasi, rekomendasi_mhs.created_at FROM rekomendasi_mhs WHERE mahasiswa_id = '${userLoginId}'`
  );

  res.status(201).json({
    data: query.rows,
  });
});
