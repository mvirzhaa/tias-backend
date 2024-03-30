const express = require("express");

const {
  getValidasiDokumen,
  showQr,
} = require("../../controllers/validasi_digital/validasiDokumenController");

const router = express.Router();

router.get("/validasi-dokumen", getValidasiDokumen);
router.get("/validasi-dokumen/:id", showQr);

module.exports = router;
