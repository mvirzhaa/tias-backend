const express = require("express");
const { protected } = require("../middleware/authMiddleware");
const { getInformaticsStudent, getDosenInfromatics, getIpMhs, getKategoriIp, getMatkulHelp, queryIp } = require("../controllers/helperController");


const router = express.Router();

router.get("/get-mhs-ti", protected, getInformaticsStudent);
router.get("/get-dosen-ti",  getDosenInfromatics);
router.get("/get-ip",  protected, getIpMhs);
router.get("/get-ip-kategori", protected, getKategoriIp);
router.post("/get-matkul", getMatkulHelp);
router.get("/query-ip", protected, queryIp);

module.exports = router;
