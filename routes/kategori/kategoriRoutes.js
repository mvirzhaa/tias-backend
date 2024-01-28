const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const { getKategoriSerti, createDataKategoriSertifikasi, deleteDataById, getDataById, editDataById } = require("../../controllers/kategori/kategoriSertifikasiController");
const { getKategoriPublikasi, createDataKategoriPublikasi, getDataByIdPublikasi, deleteDataByIdPublikasi, editDataByIdPublikasi } = require("../../controllers/kategori/kategoriPublikasiController");
const { getKategoriPrestasi, createDataKategoriPrestasi, getDataByIdPrestasi, editDataByIdPrestasi, deleteDataByIdPretasi } = require("../../controllers/kategori/kategoriPrestasiController");
const { getKategoriHki, createDataKategoriHki, getDataByIdHki, deleteDataByIdHki, editDataByIdHki } = require("../../controllers/kategori/kategoriHkiController");
const { getKategoriProf, createDataKategoriProfesi, getDataByIdProfesi, deleteDataByIdProfesi, editDataByIdProfesi } = require("../../controllers/kategori/kategoriProfesiController");
const { getKategoriIp, createDataKategoriIp, getDataByIdIp, deleteDataByIdIp, editDataByIdIp } = require("../../controllers/kategori/kategoriIpController");
const { getKategoriRekomendasi, createDataKategoriRekomendasi, getDataByIdRekomendasi, deleteDataByIdRekomendasi, editDataByIdRekomendasi } = require("../../controllers/kategori/pointRekomendasiController");

const router = express.Router();

router.get("/sertifikasi", protected, getKategoriSerti);
router.post("/sertifikasi", protected, adminOnly, createDataKategoriSertifikasi);
router.get("/sertifikasi/:id", protected, getDataById);
router.delete("/sertifikasi/:id", protected, adminOnly, deleteDataById);
router.patch("/sertifikasi/:id", protected, adminOnly, editDataById);

router.get("/publikasi", protected, getKategoriPublikasi);
router.post("/publikasi", protected, adminOnly, createDataKategoriPublikasi);
router.get("/publikasi/:id", protected, getDataByIdPublikasi);
router.delete("/publikasi/:id", protected, adminOnly, deleteDataByIdPublikasi);
router.patch("/publikasi/:id", protected, adminOnly, editDataByIdPublikasi);

router.get("/prestasi", protected, getKategoriPrestasi);
router.post("/prestasi", protected, adminOnly, createDataKategoriPrestasi);
router.get("/prestasi", protected, getDataByIdPrestasi);
router.get("/prestasi/:id", protected, getDataByIdPrestasi);
router.delete("/prestasi/:id", protected, adminOnly, deleteDataByIdPretasi);
router.patch("/prestasi/:id", protected, adminOnly, editDataByIdPrestasi);

router.get("/hki", protected, getKategoriHki);
router.post("/hki", protected, adminOnly, createDataKategoriHki);
router.get("/hki/:id", protected, getDataByIdHki);
router.delete("/hki/:id", protected, adminOnly, deleteDataByIdHki);
router.patch("/hki/:id", protected, adminOnly, editDataByIdHki);

router.get("/profesi", protected, getKategoriProf);
router.post("/profesi", protected, adminOnly, createDataKategoriProfesi);
router.get("/profesi/:id", protected, getDataByIdProfesi);
router.delete("/profesi/:id", protected, adminOnly, deleteDataByIdProfesi);
router.patch("/profesi/:id", protected, adminOnly, editDataByIdProfesi);

router.get("/ip", protected, getKategoriIp);
router.post("/ip", protected, adminOnly, createDataKategoriIp);
router.get("/ip/:id", protected, getDataByIdIp);
router.delete("/ip/:id", protected, adminOnly, deleteDataByIdIp);
router.patch("/ip/:id", protected, adminOnly, editDataByIdIp);

router.get("/rekomendasi", protected, getKategoriRekomendasi);
router.post("/rekomendasi", protected, adminOnly, createDataKategoriRekomendasi);
router.get("/rekomendasi/:id", protected, getDataByIdRekomendasi);
router.delete("/rekomendasi/:id", protected, adminOnly, deleteDataByIdRekomendasi);
router.patch("/rekomendasi/:id", protected, adminOnly, editDataByIdRekomendasi);

module.exports = router;
