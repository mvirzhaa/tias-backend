const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const PembelajaranController = require("../../controllers/absensi_external/PembelajaranController");
const AbsensiController = require("../../controllers/absensi_external/AbsensiController");

const router = express.Router();

router.get("/pembelajaran", PembelajaranController.index);
router.get("/pembelajaran/all", protected, PembelajaranController.all);
router.get(
  "/pembelajaran/check-pertemuan",
  PembelajaranController.checkPertemuan
);

router.get("/pembelajaran/show-qr", PembelajaranController.showQr);
router.get("/pembelajaran/:id", protected, PembelajaranController.detail);
router.post("/pembelajaran", protected, PembelajaranController.create);
router.put("/pembelajaran/:id", protected, PembelajaranController.update);
router.post(
  "/pembelajaran/non-active/:id",
  protected,
  PembelajaranController.nonActive
);
router.delete("/pembelajaran/:id", protected, PembelajaranController.destroy);

router.get("/absensi", AbsensiController.index);
router.get("/absensi/all", protected, AbsensiController.all);
router.get("/absensi/:id", protected, AbsensiController.detail);
router.post("/absensi", protected, AbsensiController.create);
router.put("/absensi/:id", protected, AbsensiController.update);
router.delete("/absensi/:id", protected, AbsensiController.destroy);
router.post("/absensi/scan-qr", AbsensiController.scanQr);

module.exports = router;
