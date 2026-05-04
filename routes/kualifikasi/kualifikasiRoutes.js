const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const { kualifikasiUpload } = require("../../middleware/kualifikasiUpload");
const {
  addRiwayatPekerjaan,
  getDataRiwayatPekerjaan,
  detailDataRiwayatPekerjaan,
  editDataRiwayatPekerjaan,
  deleteDataRiwayatPekerjaan,
  editStatusRiwayatPekerjaan,
  filterDataRiwayatPekerjaan,
  approveStatusRiwayatPekerjaan,
  rejectStatusRiwayatPekerjaan,
} = require("../../controllers/kualifikasi/riwayatPekerjaanController");
const {
  detailDataPendidikan,
  deleteDataPendidikan,
  editDataPendidikan,
  addPendidikan,
  getDataPendidikan,
  editStatusPendidikan,
  filterDataPendidikan,
  approveStatusPendidikan,
  rejectStatusPendidikan,
} = require("../../controllers/kualifikasi/pendidikanController");
const router = express.Router();

// ============= RIWAYAT PEKERJAAN ======================
router.post(
  "/addRiwayatPekerjaan",
  protected,
  kualifikasiUpload,
  addRiwayatPekerjaan
);
router.get("/getDataRiwayatPekerjaan", protected, getDataRiwayatPekerjaan);
router.get(
  "/detailRiwayatPekerjaan/:rwytId",
  protected,
  detailDataRiwayatPekerjaan
);
router.patch(
  "/editRiwayatPekerjaan/:rwytId",
  protected,
  kualifikasiUpload,
  editDataRiwayatPekerjaan
);
router.delete(
  "/deleteRiwayatPekerjaan/:rwytId",
  protected,
  deleteDataRiwayatPekerjaan
);
router.patch(
  "/approveStatusRwyt/:rwytId",
  protected,
  adminOnly,
  approveStatusRiwayatPekerjaan
);
router.patch(
  "/rejectStatusRwyt/:rwytId",
  protected,
  adminOnly,
  rejectStatusRiwayatPekerjaan
);
router.get("/filterRiwayatPekerjaan", protected, filterDataRiwayatPekerjaan);
// ============= END RIWAYAT PEKERJAAN ==================

// ================== PENDIDIKAN FORMAL ======================
router.post("/addPend", protected, kualifikasiUpload, addPendidikan);
router.get("/getDataPend", protected, getDataPendidikan);
router.get("/detailPend/:pendId", protected, detailDataPendidikan);
router.patch(
  "/editDataPend/:pendId",
  protected,
  kualifikasiUpload,
  editDataPendidikan
);
router.delete("/deletePend/:pendId", protected, deleteDataPendidikan);
router.patch(
  "/approveStatusPend/:pendId",
  protected,
  adminOnly,
  approveStatusPendidikan
);
router.patch(
  "/rejectStatusPend/:pendId",
  protected,
  adminOnly,
  rejectStatusPendidikan
);
router.get("/filterPend", protected, filterDataPendidikan);
// ================== END PENDIDIKAN FORMAL ==================

module.exports = router;
