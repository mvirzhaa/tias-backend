const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { getInformaticsStudent, getDosen } = require("../../helper/informatics");

exports.getUserMhs = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;

  const user = await DB.query(
    "SELECT tb_users.*, tb_data_pribadi.*, kategori_mhs.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id JOIN kategori_mhs ON tb_data_pribadi.kode_mhs = kategori_mhs.kode WHERE tb_users.role = 'Mahasiswa' AND tb_users.isverified = true LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  res.status(200).json({
    message: "Success get data.",
    data: user.rows,
  });
});

exports.getUserDosen = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;

  const user = await DB.query(
    "SELECT tb_users.*, tb_data_pribadi.*, tb_jabatan_dosen.jabatan_id, tb_jabatan_dosen.jabatan_fungsi FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id LEFT JOIN (SELECT user_id, jabatan_id, jabatan_fungsi FROM tb_jabatan_dosen WHERE (user_id, updated_at) IN (SELECT user_id, MAX(updated_at) AS max_updated_at FROM tb_jabatan_dosen GROUP BY user_id)) AS tb_jabatan_dosen ON tb_users.user_id = tb_jabatan_dosen.user_id WHERE tb_users.role = 'Dosen' LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  res.status(200).json({
    message: "Success get data.",
    data: user.rows,
  });
});

exports.detailUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const findData = await DB.query(
    "SELECT tb_users.*, tb_data_pribadi.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id=tb_data_pribadi.user_id WHERE tb_users.user_id = $1",
    [userId]
  );

  const dataRekomendasi = await DB.query(
    "SELECT rekomendasi_mhs.body as text_rekomendasi, rekomendasi_mhs.created_at, tb_data_pribadi.nama_lengkap as nama_dosen, tb_data_pribadi.image,tb_users.nidn FROM rekomendasi_mhs LEFT JOIN tb_data_pribadi ON rekomendasi_mhs.user_id = tb_data_pribadi.user_id LEFT JOIN tb_users ON rekomendasi_mhs.user_id = tb_users.user_id WHERE mahasiswa_id = $1",
    [userId]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
    rekomendasiMhs: dataRekomendasi.rows,
  });
});

exports.getInformaticsStudent = asyncHandler(async (req, res) => {
  try {
    const departmentCode = "FT_TI";
    const results = await getInformaticsStudent(departmentCode);

    const npm = "201106040468";

    const studentWithNpm = results.find((student) => student.code === npm);

    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving students by department:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getDosenInfromatics = asyncHandler(async (req, res) => {
  try {
    const departmentCode = "FT_TI";
    const results = await getDosen(departmentCode);

    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving students by department:", error);
    res.status(500).send("Internal Server Error");
  }
});
