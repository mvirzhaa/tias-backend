const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");
const { insertValidasiDokumen } = require("../../utils/validasiDigital");

exports.addRekomendasi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const userNamaLengkap = req.user.nama_lengkap;
  const data = req.body;

  if (!data.body || !data.mahasiswa_id) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const user = await DB.query(
    "SELECT tb_users.*, tb_data_pribadi.total_point, tb_data_pribadi.nama_lengkap FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.user_id = $1",
    [data.mahasiswa_id]
  );

  if (user.rows[0].total_point <= 2400) {
    res.status(400);
    throw new Error("The user has not reached point 2400 as a proficient.");
  }

  if (user.rows.length) {
    const findRekomendasi = await DB.query(
      "SELECT * FROM rekomendasi_mhs WHERE user_id = $1 AND mahasiswa_id = $2",
      [userLoginId, data.mahasiswa_id]
    );

    if (findRekomendasi.rows.length) {
      res.status(400);
      throw new Error("you have made the recommendation.");
    }

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

      const findUsePoint = await DB.query(
        "SELECT point FROM point_rekomendasi WHERE status = $1",
        [1]
      );

      const pointUse = Number(findUsePoint.rows[0].point);

      const totalData = jumlahDataRekomen.rows[0].count * pointUse;

      await DB.query(
        "UPDATE tb_data_pribadi SET point_rekomendasi = $1 WHERE user_id = $2",
        [totalData, data.mahasiswa_id]
      );

      await insertValidasiDokumen({
        pelaksana: userNamaLengkap,
        mhs_id: user.rows[0].nama_lengkap,
        nama_kegiatan: `Memberikan Rekomendasi Mahasiswa`,
        link_kegiatan: `${process.env.FRONTEND_REDIRECT_URL}/dosen/rek-mhs/detail-mhs/${data.mahasiswa_id}`,
        link_validasi: `${process.env.FRONTEND_REDIRECT_URL}`,
        link_attachment: "",
      });

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
    `SELECT rekomendasi_mhs.*, tb_users.nidn, tb_data_pribadi.nama_lengkap FROM rekomendasi_mhs JOIN tb_data_pribadi ON rekomendasi_mhs.user_id = tb_data_pribadi.user_id JOIN tb_users ON tb_users.user_id = rekomendasi_mhs.user_id WHERE mahasiswa_id = '${userLoginId}'`
  );

  res.status(201).json({
    data: query.rows,
  });
});
