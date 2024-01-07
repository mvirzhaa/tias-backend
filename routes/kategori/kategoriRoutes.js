const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const { getKategoriSerti, createDataKategoriSertifikasi, deleteDataById, getDataById, editDataById } = require("../../controllers/kategori/kategoriSertifikasiController");
const { getKategoriPublikasi, createDataKategoriPublikasi, getDataByIdPublikasi, deleteDataByIdPublikasi, editDataByIdPublikasi } = require("../../controllers/kategori/kategoriPublikasiController");
const { getKategoriPrestasi, createDataKategoriPrestasi, getDataByIdPrestasi, editDataByIdPrestasi, deleteDataByIdPretasi } = require("../../controllers/kategori/kategoriPrestasiController");
const { getKategoriHki, createDataKategoriHki, getDataByIdHki, deleteDataByIdHki, editDataByIdHki } = require("../../controllers/kategori/kategoriHkiController");
const { getKategoriProf, createDataKategoriProfesi, getDataByIdProfesi, deleteDataByIdProfesi, editDataByIdProfesi } = require("../../controllers/kategori/kategoriProfesiController");

const router = express.Router();

router.get("/sertifikasi", protected, getKategoriSerti);
router.post("/sertifikasi", protected, createDataKategoriSertifikasi);
router.get("/sertifikasi/:id", protected, getDataById);
router.delete("/sertifikasi/:id", protected, deleteDataById);
router.patch("/sertifikasi/:id", protected, editDataById);

router.get("/publikasi", protected, getKategoriPublikasi);
router.post("/publikasi", protected, createDataKategoriPublikasi);
router.get("/publikasi/:id", protected, getDataByIdPublikasi);
router.delete("/publikasi/:id", protected, deleteDataByIdPublikasi);
router.patch("/publikasi/:id", protected, editDataByIdPublikasi);

router.get("/prestasi", protected, getKategoriPrestasi);
router.post("/prestasi", protected, createDataKategoriPrestasi);
router.get("/prestasi", protected, getDataByIdPrestasi);
router.get("/prestasi/:id", protected, getDataByIdPrestasi);
router.delete("/prestasi/:id", protected, deleteDataByIdPretasi);
router.patch("/prestasi/:id", protected, editDataByIdPrestasi);

router.get("/hki", protected, getKategoriHki);
router.post("/hki", protected, createDataKategoriHki);
router.get("/hki/:id", protected, getDataByIdHki);
router.delete("/hki/:id", protected, deleteDataByIdHki);
router.patch("/hki/:id", protected, editDataByIdHki);

router.get("/profesi", protected, getKategoriProf);
router.post("/profesi", protected, createDataKategoriProfesi);
router.get("/profesi/:id", protected, getDataByIdProfesi);
router.delete("/profesi/:id", protected, deleteDataByIdProfesi);
router.patch("/profesi/:id", protected, editDataByIdProfesi);

module.exports = router;
