const express = require("express");
const { protected } = require("../middleware/authMiddleware");
const {
  getInformaticsStudent,
  getDosenInfromatics,
  getIpMhs,
  getKategoriIp,
  getMatkulHelp,
  queryIp,
  getClassControler,
  achievementsKategori,
  getPrestasi,
  getOrganisasi,
  getSertifikasi,
  getSkpiPerkuliahan,
  tesGetMatkul,
  getPmmStudent,
  getDepartemenController,
} = require("../controllers/helperController");

const router = express.Router();

router.get("/get-mhs-ti", protected, getInformaticsStudent);
router.get("/get-dosen-ti", getDosenInfromatics);
router.get("/get-ip", protected, getIpMhs);
router.get("/get-ip-kategori", protected, getKategoriIp);
router.post("/get-matkul", getMatkulHelp);
router.get("/get-class", getClassControler);
router.get("/query-ip", protected, queryIp);
router.get("/get-achievements", achievementsKategori);

router.get("/skpi-prestasi", getPrestasi);
router.get("/skpi-organisasi", getOrganisasi);
router.get("/skpi-sertifikasi", getSertifikasi);

router.get("/skpi-perkuliahan", protected, getSkpiPerkuliahan);
router.get("/tes-get-matkul", tesGetMatkul);

router.get("/pmm-student", getPmmStudent);

router.get("/departemen", getDepartemenController);

module.exports = router;
