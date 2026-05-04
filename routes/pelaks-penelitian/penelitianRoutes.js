const express = require("express");
const {
  protected,
  adminOnly,
  dosenOnly,
} = require("../../middleware/authMiddleware");
const {
  addDataPenelitian,
  addDokumenPenelitian,
  getDataPenelitian,
  detailDataPenelitian,
  detailDokumenPenelitian,
  deleteDokumenPenelitian,
  editDokumenPenelitian,
  deleteDataPenelitian,
  editDataPenelitian,
  updateStatusPenelitian,
  filterDataPenelitian,
  approveStatusPenelitian,
  rejectedStatusPenelitian,
} = require("../../controllers/pelaks-penelitian/penelitianController");
const {
  dokumenPenelitianUpload,
} = require("../../middleware/pelaks-penelitian/dokumenPenelitianUpload");

const router = express.Router();

// ============= PENELITIAN ======================
router.post(
  "/addPenelitian",
  protected,
  dokumenPenelitianUpload,
  addDataPenelitian
);
router.get("/getDatapenelitian", protected, getDataPenelitian);
router.get("/detailPenelitian/:penelitianId", protected, detailDataPenelitian);
router.patch(
  "/editPenelitian/:penelitianId",
  protected,
  dokumenPenelitianUpload,
  editDataPenelitian
);
router.delete(
  "/deletePenelitian/:penelitianId",
  protected,
  deleteDataPenelitian
);
router.patch(
  "/approveStatus/:penelitianId",
  protected,
  adminOnly,
  approveStatusPenelitian
);
router.patch(
  "/rejectStatus/:penelitianId",
  protected,
  adminOnly,
  rejectedStatusPenelitian
);
router.get("/filter", protected, filterDataPenelitian);
// ============= END PENELITIAN =====================

// ============= DOKUMEN PENELITIAN ==============
router.post(
  "/addDokumenPenelitian",
  protected,
  dokumenPenelitianUpload,
  addDokumenPenelitian
);
router.get("/detailDokumen/:dokumenId", protected, detailDokumenPenelitian);
router.delete("/deleteDokumen/:dokumenId", protected, deleteDokumenPenelitian);
router.patch(
  "/editDokumen/:dokumenId",
  protected,
  dokumenPenelitianUpload,
  editDokumenPenelitian
);
// ============= END DOKUMEN PENELITIAN ==========

module.exports = router;
