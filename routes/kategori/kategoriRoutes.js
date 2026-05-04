const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  getKategoriSerti,
  createDataKategoriSertifikasi,
  deleteDataById,
  getDataById,
  editDataById,
} = require("../../controllers/master/kategoriSertifikasiController");
const {
  getKategoriPublikasi,
  createDataKategoriPublikasi,
  getDataByIdPublikasi,
  deleteDataByIdPublikasi,
  editDataByIdPublikasi,
} = require("../../controllers/master/kategoriPublikasiController");
const {
  getKategoriPrestasi,
  createDataKategoriPrestasi,
  getDataByIdPrestasi,
  editDataByIdPrestasi,
  deleteDataByIdPretasi,
} = require("../../controllers/master/kategoriPrestasiController");
const {
  getKategoriHki,
  createDataKategoriHki,
  getDataByIdHki,
  deleteDataByIdHki,
  editDataByIdHki,
} = require("../../controllers/master/kategoriHkiController");
const {
  getKategoriProf,
  createDataKategoriProfesi,
  getDataByIdProfesi,
  deleteDataByIdProfesi,
  editDataByIdProfesi,
} = require("../../controllers/master/kategoriProfesiController");
const {
  getKategoriIp,
  createDataKategoriIp,
  getDataByIdIp,
  deleteDataByIdIp,
  editDataByIdIp,
} = require("../../controllers/master/kategoriIpController");
const {
  getKategoriRekomendasi,
  createDataKategoriRekomendasi,
  getDataByIdRekomendasi,
  deleteDataByIdRekomendasi,
  editDataByIdRekomendasi,
} = require("../../controllers/master/pointRekomendasiController");
const KategoriLaporanController = require("../../controllers/master/kategoriLaporanController");
const KategoriKegiatanController = require("../../controllers/master/kategoriKegiatan");
const UnitController = require("../../controllers/master/unitController");
const JabatanController = require("../../controllers/master/jabatanController");
const MatakuliahController = require("../../controllers/master/matakuliahController");
const KurikulumController = require("../../controllers/master/kurikulumController");

const router = express.Router();

router.get("/sertifikasi", protected, getKategoriSerti);
router.post(
  "/sertifikasi",
  protected,
  adminOnly,
  createDataKategoriSertifikasi
);
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
router.post(
  "/rekomendasi",
  protected,
  adminOnly,
  createDataKategoriRekomendasi
);
router.get("/rekomendasi/:id", protected, getDataByIdRekomendasi);
router.delete(
  "/rekomendasi/:id",
  protected,
  adminOnly,
  deleteDataByIdRekomendasi
);
router.patch("/rekomendasi/:id", protected, adminOnly, editDataByIdRekomendasi);

router.get("/laporan", protected, KategoriLaporanController.index);
router.get("/laporan/:id", protected, KategoriLaporanController.detail);
router.post("/laporan", protected, KategoriLaporanController.create);
router.put("/laporan/:id", protected, KategoriLaporanController.update);
router.delete("/laporan/:id", protected, KategoriLaporanController.destroy);

router.get("/kegiatan", protected, KategoriKegiatanController.index);
router.get("/kegiatan/all", protected, KategoriKegiatanController.all);
router.get("/kegiatan/:id", protected, KategoriKegiatanController.detail);
router.post("/kegiatan", protected, KategoriKegiatanController.create);
router.put("/kegiatan/:id", protected, KategoriKegiatanController.update);
router.delete("/kegiatan/:id", protected, KategoriKegiatanController.destroy);

router.get("/unit", UnitController.index);
router.get("/unit/all", UnitController.all);
router.get("/unit/:id", protected, UnitController.detail);
router.post("/unit", protected, UnitController.create);
router.put("/unit/:id", protected, UnitController.update);
router.delete("/unit/:id", protected, UnitController.destroy);

router.get("/jabatan", protected, JabatanController.index);
router.get("/jabatan/all", protected, JabatanController.all);
router.get("/jabatan/:id", protected, JabatanController.detail);
router.post("/jabatan", protected, JabatanController.create);
router.put("/jabatan/:id", protected, JabatanController.update);
router.delete("/jabatan/:id", protected, JabatanController.destroy);

router.get("/matakuliah", protected, MatakuliahController.index);
router.get("/matakuliah/all", protected, MatakuliahController.all);
router.get("/matakuliah/:id", protected, MatakuliahController.detail);
router.post("/matakuliah", protected, MatakuliahController.create);
router.put("/matakuliah/:id", protected, MatakuliahController.update);
router.delete("/matakuliah/:id", protected, MatakuliahController.destroy);

router.get("/kurikulum", protected, KurikulumController.index);
router.get("/kurikulum/all", protected, KurikulumController.all);
router.get("/kurikulum/:id", protected, KurikulumController.detail);
router.post("/kurikulum", protected, KurikulumController.create);
router.put("/kurikulum/:id", protected, KurikulumController.update);
router.delete("/kurikulum/:id", protected, KurikulumController.destroy);

module.exports = router;
