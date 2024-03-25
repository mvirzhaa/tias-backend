const express = require("express");

const {
  getValidasiDokumen,
} = require("../../controllers/validasi_digital/validasiDokumenController");

const router = express.Router();

router.get("/validasi-dokumen", getValidasiDokumen);

module.exports = router;
