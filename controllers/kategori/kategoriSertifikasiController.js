const asyncHandler = require("express-async-handler");
const DB = require("../../database");

exports.getKategoriSerti = asyncHandler(async (req, res) => {
  const data = await DB.query("SELECT * FROM kategori_sertifikasi");

  res.status(201).json({
    data: data.rows,
  });
});

exports.getKategoriPublikasi = asyncHandler(async (req, res) => {
  const data = await DB.query("SELECT * FROM kategori_publikasi");

  res.status(201).json({
    data: data.rows,
  });
});

exports.getKategoriPrestasi = asyncHandler(async (req, res) => {
  const data = await DB.query("SELECT * FROM kategori_prestasi");

  res.status(201).json({
    data: data.rows,
  });
});

exports.getKategoriHki = asyncHandler(async (req, res) => {
  const data = await DB.query("SELECT * FROM kategori_hki");

  res.status(201).json({
    data: data.rows,
  });
});

exports.getKategoriProf = asyncHandler(async (req, res) => {
  const data = await DB.query("SELECT * FROM kategori_profesi");

  res.status(201).json({
    data: data.rows,
  });
});
