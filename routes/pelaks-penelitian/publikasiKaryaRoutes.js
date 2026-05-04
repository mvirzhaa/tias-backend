const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  addDataPublikasi,
  getDataPublikasi,
  detailDataPublikasi,
  editDataPublikasi,
  deleteDataPublikasi,
  addDokumenPublikasi,
  detailDokumenPublikasi,
  deleteDokumenPublikasi,
  editDokumenPublikasi,
  filterDataPublikasi,
  rejectStatusPublikasi,
  approveStatusPublikasi,
} = require("../../controllers/pelaks-penelitian/publikasiKaryaController");
const {
  publikasiKaryaUpload,
} = require("../../middleware/pelaks-penelitian/publikasiKaryaUpload");

const router = express.Router();

// ============= PENELITIAN ======================
router.post("/addPublikasi", protected, publikasiKaryaUpload, addDataPublikasi);
router.get("/getPublikasi", protected, getDataPublikasi);
router.get("/detailPublikasi/:publikasiId", protected, detailDataPublikasi);
router.patch(
  "/editPublikasi/:publikasiId",
  protected,
  publikasiKaryaUpload,
  editDataPublikasi
);
router.delete("/deletePublikasi/:publikasiId", protected, deleteDataPublikasi);
router.patch(
  "/approveStatus/:publikasiId",
  protected,
  adminOnly,
  approveStatusPublikasi
);
router.patch(
  "/rejectStatus/:publikasiId",
  protected,
  adminOnly,
  rejectStatusPublikasi
);
router.get("/filter", protected, filterDataPublikasi);
// ============= END PENELITIAN =====================

// ============= DOKUMEN PUBLIKASI ==============
router.post(
  "/addDokumen",
  protected,
  publikasiKaryaUpload,
  addDokumenPublikasi
);
router.get("/detailDokumen/:dokumenId", protected, detailDokumenPublikasi);
router.delete("/deleteDokumen/:dokumenId", protected, deleteDokumenPublikasi);
router.patch(
  "/editDokumen/:dokumenId",
  protected,
  publikasiKaryaUpload,
  editDokumenPublikasi
);
// ============= END DOKUMEN PUBLIKASI ==========

module.exports = router;
