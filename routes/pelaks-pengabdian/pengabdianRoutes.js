const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  pengabdianUpload,
} = require("../../middleware/pelaks-pengabdian/pengabdianUpload");
const {
  addDataPengabdian,
  getDataPengabdian,
  detailDataPengabdian,
  editDataPengabdian,
  deleteDataPengabdian,
  addDokumenPengabdian,
  detailDokumenPengabdian,
  deleteDokumenPengabdian,
  editDokumenPengabdian,
  filterDataPengabdian,
  approveStatusPengabdian,
  rejectStatusPengabdian,
} = require("../../controllers/pelaks-pengabdian/pengabdianController");

const router = express.Router();

// ============= PENGABDIAN ======================
router.post("/addPengabdian", protected, pengabdianUpload, addDataPengabdian);
router.get("/getDataPengabdian", protected, getDataPengabdian);
router.get("/detailPengabdian/:pengabdianId", protected, detailDataPengabdian);
router.patch(
  "/editPengabdian/:pengabdianId",
  protected,
  pengabdianUpload,
  editDataPengabdian
);
router.delete(
  "/deletePengabdian/:pengabdianId",
  protected,
  deleteDataPengabdian
);
router.patch(
  "/approveStatusPengabdian/:pengabdianId",
  protected,
  adminOnly,
  approveStatusPengabdian
);
router.patch(
  "/rejectStatusPengabdian/:pengabdianId",
  protected,
  adminOnly,
  rejectStatusPengabdian
);
router.get("/filterPengabdian", protected, filterDataPengabdian);
// ============= END PENGABDIAN =====================

// ============= DOKUMEN PENGABDIAN ==============
router.post("/addDokumen", protected, pengabdianUpload, addDokumenPengabdian);
router.get("/detailDokumen/:dokumenId", protected, detailDokumenPengabdian);
router.delete("/deleteDokumen/:dokumenId", protected, deleteDokumenPengabdian);
router.patch(
  "/editDokumen/:dokumenId",
  protected,
  pengabdianUpload,
  editDokumenPengabdian
);
// ============= END DOKUMEN PENGABDIAN ==========

module.exports = router;
