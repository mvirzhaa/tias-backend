const express = require("express");

const {
  showQr,
  createValiation,
  editValidation,
  index,
  destroy,
  findOne,
} = require("../../controllers/validasi_digital/validasiDokumenController");

const router = express.Router();

router.get("/validasi-dokumen", index);
router.get("/validasi-dokumen/:id", showQr);
router.get("/validasi-dokumen/detail/:id", findOne);
router.post("/validasi-dokumen", createValiation);
router.put("/validasi-dokumen/:id", editValidation);
router.delete("/validasi-dokumen/:id", destroy);

module.exports = router;
