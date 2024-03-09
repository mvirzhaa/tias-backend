const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  getPembelajaran,
  storePembelajaran,
  cekPertemuan,
  listPertemuan,
  listAbsensi,
  deletePertemuan,
} = require("../../controllers/absensi/pembelajaranController");
const {
  getAbsensi,
  storeAbsensi,
  deleteAbsensi,
  scanQr,
  showQr,
  updateAbsensi,
  dosenForMk,
  absensiForMhs,
  getDosenForAbsensi,
} = require("../../controllers/absensi/absensiController");
const {
  exportListPertemuan,
} = require("../../controllers/absensi/exportExcel");

const router = express.Router();

router.get("/get-pembelajaran", getPembelajaran);
router.post("/store", storePembelajaran);
router.get("/cek-pertemuan", cekPertemuan);
router.get("/list-pertemuan", listPertemuan);
router.get("/list-absensi", listAbsensi);
router.delete("/delete-pertemuan/:id", deletePertemuan);

router.get("/get-absensi", getAbsensi);
router.get("/get-absensi-mhs", protected, absensiForMhs);
router.post("/scan-qr", scanQr);
router.get("/show-qr", showQr);
router.post("/store-absensi", storeAbsensi);
router.delete("/delete-absensi/:id", deleteAbsensi);
router.post("/update-absensi/:id", updateAbsensi);

router.get("/dosen-mk", dosenForMk);

router.get("/list-pertemuan/excel", exportListPertemuan);
router.get("/list-dosen", getDosenForAbsensi);

module.exports = router;
