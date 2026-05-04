const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  addDataPembicara,
  getDataPembicara,
  detailDataPembicara,
  deleteDataPembicara,
  editDataPembicara,
  addDokumenPembicara,
  detailDokumenPembicara,
  deleteDokumenPembicara,
  editDokumenPembicara,
  updateStatusPembicara,
  filterDataPembicara,
  approveStatusPembicara,
  rejectStatusPembicara,
} = require("../../controllers/pelaks-pengabdian/pembicaraController");
const {
  dokumenPembicaraUpload,
} = require("../../middleware/pelaks-pengabdian/pembicaraUpload");

const router = express.Router();

// ============= PENELITIAN ======================
router.post(
  "/addPembicara",
  protected,
  dokumenPembicaraUpload,
  addDataPembicara
);
router.get("/getDataPembicara", protected, getDataPembicara);
router.get("/detailPembicara/:pembicaraId", protected, detailDataPembicara);
router.patch(
  "/editPembicara/:pembicaraId",
  protected,
  dokumenPembicaraUpload,
  editDataPembicara
);
router.delete("/deletePembicara/:pembicaraId", protected, deleteDataPembicara);
router.patch(
  "/approveStatusPembicara/:pembicaraId",
  protected,
  adminOnly,
  approveStatusPembicara
);
router.patch(
  "/rejectStatusPembicara/:pembicaraId",
  protected,
  adminOnly,
  rejectStatusPembicara
);
router.get("/filterPembicara", protected, filterDataPembicara);
// ============= END PENELITIAN =====================

// ============= DOKUMEN PEMBICARA ==============
router.post(
  "/addDokumenPembicara",
  protected,
  dokumenPembicaraUpload,
  addDokumenPembicara
);
router.get("/detailDokumen/:dokumenId", protected, detailDokumenPembicara);
router.delete("/deleteDokumen/:dokumenId", protected, deleteDokumenPembicara);
router.patch(
  "/editDokumen/:dokumenId",
  protected,
  dokumenPembicaraUpload,
  editDokumenPembicara
);
// ============= END DOKUMEN PEMBICARA ==========

module.exports = router;
