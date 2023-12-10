const express = require("express");
const {
  protected,
  adminDosenOnly,
} = require("../../middleware/authMiddleware");
const {
  bahanAjarUpload,
} = require("../../middleware/pelaks-pendidikan/bahanAjarUpload");
const {
  addBahanAjar,
  getDataBahanAjar,
  detailDataBahanAjar,
  editDataBahanAjar,
  deleteDataBahanAjar,
  addDokumenBahanAjar,
  detailDokumenbahanAjar,
  deleteDokumenBahanAjar,
  editDokumenBahanAjar,
  approveStatusBahanAjar,
  rejectStatusBahanAjar,
} = require("../../controllers/pelaks-pendidikan/bahanAjarController");

const router = express.Router();

// =============  ======================
router.post("/add", protected, adminDosenOnly, bahanAjarUpload, addBahanAjar);
router.get("/get", protected, adminDosenOnly, getDataBahanAjar);
router.get(
  "/detail/:bahanAjarId",
  protected,
  adminDosenOnly,
  detailDataBahanAjar
);
router.patch(
  "/edit/:bahanAjarId",
  protected,
  adminDosenOnly,
  bahanAjarUpload,
  editDataBahanAjar
);
router.delete(
  "/delete/:bahanAjarId",
  protected,
  adminDosenOnly,
  deleteDataBahanAjar
);
router.patch(
  "/approve/:bahanAjarId",
  protected,
  adminDosenOnly,
  approveStatusBahanAjar
);
router.patch(
  "/reject/:bahanAjarId",
  protected,
  adminDosenOnly,
  rejectStatusBahanAjar
);
// ============= END  =====================

// ============= DOKUMEN  ==============
router.post("/addDokumen", protected, bahanAjarUpload, addDokumenBahanAjar);
router.get("/detailDokumen/:dokumenId", protected, detailDokumenbahanAjar);
router.delete("/deleteDokumen/:dokumenId", protected, deleteDokumenBahanAjar);
router.patch(
  "/editDokumen/:dokumenId",
  protected,
  bahanAjarUpload,
  editDokumenBahanAjar
);
// ============= END DOKUMEN  ==========

module.exports = router;
