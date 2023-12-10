const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  getKategoriSerti,
  getKategoriPublikasi,
  getKategoriPrestasi,
  getKategoriHki,
  getKategoriProf,
} = require("../../controllers/kategori/kategoriSertifikasiController");

const router = express.Router();

router.get("/sertifikasi", protected, getKategoriSerti);
router.get("/publikasi", protected, getKategoriPublikasi);
router.get("/prestasi", protected, getKategoriPrestasi);
router.get("/hki", protected, getKategoriHki);
router.get("/profesi", protected, getKategoriProf);

module.exports = router;
