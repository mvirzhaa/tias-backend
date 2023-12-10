const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");
const fs = require("fs-extra");
const path = require("path");

exports.createDataPribadi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const findData = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
    [userLoginId]
  );

  if (findData.rows.length) {
    res.status(400);
    throw new Error("Your account already has personal data.");
  }

  const data = req.body;

  if (
    data.point_sertifikasi ||
    data.point_hki ||
    data.point_rekomendasi ||
    data.point_publikasi ||
    data.prestasi ||
    data.point_ipk
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  if (
    !data.nama_lengkap ||
    !data.jenkel ||
    !data.tanggal_lahir ||
    !data.tempat_lahir ||
    !data.ibu_kandung ||
    !data.nik ||
    !data.agama ||
    !data.warga_negara ||
    !data.email ||
    !data.alamat ||
    !data.rt ||
    !data.rw ||
    !data.desa_kelurahan ||
    !data.kota_kabupaten ||
    !data.provinsi ||
    !data.kode_pos ||
    !data.no_hp
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const findNik = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE nik = $1",
    [data.nik]
  );

  if (findNik.rows.length) {
    res.status(400);
    throw new Error("NIK already exist.");
  }

  if (data.nik.length !== 16) {
    res.status(400);
    throw new Error("NIK must be with 16 digits.");
  }

  const findEmail = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE email = $1",
    [data.email]
  );

  if (findEmail.rows.length) {
    res.status(400);
    throw new Error("Email already exist.");
  }

  if (data.no_hp.length > 13 || data.no_hp.length < 10) {
    res.status(400);
    throw new Error("Invalid phone number.");
  }

  if (data.kode_pos.length != 5) {
    res.status(400);
    throw new Error("Invalid Pos Code.");
  }

  const findUser = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  let kode_mhs;
  if (findUser.rows[0].role == "Mahasiswa") {
    kode_mhs = 0;
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const keys = ["user_id", ...Object.keys(data), "created_at", "kode_mhs"];
  const values = [userLoginId, ...Object.values(data), convert, kode_mhs];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  const saveData = await DB.query(
    `INSERT INTO tb_data_pribadi (${keys.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values
  );

  if (saveData.rows.length) {
    res.status(200).json({
      message: "Successfull created data.",
      data: saveData.rows[0],
    });
  } else {
    res.status(400);
    throw new Error("Invalid data.");
  }
});

exports.getDataPribadi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const getTotalPoint = await DB.query(
    "SELECT point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi AS total_points FROM tb_data_pribadi WHERE user_id = $1",
    [userLoginId]
  );

  const total_points = getTotalPoint.rows[0].total_points;

  await DB.query(
    "UPDATE tb_data_pribadi SET total_point = $1 WHERE user_id = $2",
    [total_points, userLoginId]
  );

  const cekKode = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
    [userLoginId]
  );

  if (cekKode.rows[0].kode_mhs === null) {
    res.status(201).json({
      data: cekKode.rows[0],
    });
  } else {
    const query = `SELECT tb_data_pribadi.*, kategori_mhs.status_mhs, tb_users.npm, tb_users.nidn, tb_users.role FROM tb_data_pribadi JOIN kategori_mhs ON tb_data_pribadi.kode_mhs = kategori_mhs.kode JOIN tb_users ON tb_data_pribadi.user_id = tb_users.user_id WHERE tb_data_pribadi.user_id = '${userLoginId}'`;

    const dataPribadi = await DB.query(query);

    res.status(201).json({
      data: dataPribadi.rows[0],
    });
  }
});

exports.editDataPribadi = asyncHandler(async (req, res) => {
  const userLogin = req.user;

  const dataPribadi = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
    [userLogin.user_id]
  );

  if (dataPribadi.rows.length) {
    const data = req.body;

    if (data.jenkel == "") {
      res.status(300);
      throw new Error("Invalid input jenis kelamin.");
    }

    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const entries = Object.entries({ ...data, updated_at: convert });
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    const updatedData = await DB.query(
      `UPDATE tb_data_pribadi SET ${setQuery} WHERE dp_id = '${dataPribadi.rows[0].dp_id}' returning *`,
      entries.map(([_, value]) => value)
    );

    res.status(200).json({
      message: "Success Update Data.",
      data: updatedData.rows[0],
    });
  } else {
    res.status(404);
    throw new Error("data not found.");
  }
});

exports.deleteDataPribadi = asyncHandler(async (req, res) => {
  const userLogin = req.user.user_id;

  const findData = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE dp_id = $1",
    [userLogin]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await DB.query("DELETE FROM tb_data_pribadi WHERE dp_id = $1", [userLogin]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.updateStatusMhs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (!data.status_mhs) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const findData = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
    [id]
  );

  if (findData.rows.length) {
    const statusUpdate = await DB.query(
      "UPDATE tb_data_pribadi SET status_mhs = $1 WHERE user_id = $2 returning *",
      [data.status_mhs, id]
    );

    if (statusUpdate.rows.length) {
      res.status(200).json({
        message: "Status Student updated",
      });
    }
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.updateProfileImage = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  const findData = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
    [userLoginId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  if (findData.rows[0].image != "user.png") {
    await fs.remove(path.join(`public/foto-profile/${findData.rows[0].image}`));
  }

  const updated_at = unixTimestamp;
  const convert = convertDate(updated_at);

  await DB.query(
    `UPDATE tb_data_pribadi SET image = $1, updated_at = $2 WHERE user_id = $3 `,
    [file.filename, convert, userLoginId]
  );

  res.status(201).json({
    message: "Successfully update data.",
  });
});
