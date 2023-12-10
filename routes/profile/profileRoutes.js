const express = require("express");
const {
  createDataPribadi,
  editDataPribadi,
  getDataPribadi,
  deleteDataPribadi,
  updateStatusMhs,
  updateProfileImage,
} = require("../../controllers/profile/dataPribadiController");
const {
  createDokumenPribadi,
  getDokPribadi,
  editDataDok,
  deleteDataDok,
  detailDokPribadi,
} = require("../../controllers/profile/dokumenPribadiController");
const {
  protected,
  dosenOnly,
  adminOnly,
  adminDosenOnly,
} = require("../../middleware/authMiddleware");
const {
  addDataJabatan,
  getDataJabatan,
  editDataJabatan,
  deleteDataJabatan,
  detailDataJabatan,
  approveStatusJabatan,
  rejectStatusJabatan,
} = require("../../controllers/profile/jabatanController");
const {
  addDataKepangkatan,
  getDataKepangkatan,
  editDataKepangkatan,
  deleteDataKepangkatan,
  detailDataKepangkatan,
  updateStatusKepangkatan,
  approveStatusKepangkatan,
  rejectStatusKepangkatan,
} = require("../../controllers/profile/kepangkatanController");
const { profileUpload } = require("../../middleware/profileUpload");
const { profileImageUpload } = require("../../middleware/profileImageUpload");

const router = express.Router();

// ============= DATA PRIBADI ================
router.post("/createData", protected, createDataPribadi);
router.patch("/editData", protected, editDataPribadi);
router.get("/getDataPribadi", protected, getDataPribadi);
router.delete("/deleteData/:dataID", protected, adminOnly, deleteDataPribadi);
router.patch("/updateStatusMhs/:id", protected, adminOnly, updateStatusMhs);
router.patch("/updateImage", protected, profileImageUpload, updateProfileImage);
// ============= END DATA PRIBADI =============

// ============= DOKUMEN PRIBADI ==============
router.post("/createDokumen", protected, profileUpload, createDokumenPribadi);
router.get("/getDokumen", protected, getDokPribadi);
router.get("/detailDokumen/:dokId", protected, detailDokPribadi);
router.patch("/editDokumen/:dokId", protected, profileUpload, editDataDok);
router.delete("/deleteDokumen/:dokId", protected, deleteDataDok);
// ============ END DOKUMEN PRIBADI =============

// ============ JABATAN DOSEN =============
router.post(
  "/addJabatan",
  protected,
  adminDosenOnly,
  profileUpload,
  addDataJabatan
);
router.get("/getDataJabatan", protected, adminDosenOnly, getDataJabatan);
router.get(
  "/detailDataJabatan/:jabId",
  protected,
  adminDosenOnly,
  detailDataJabatan
);
router.patch(
  "/editDataJabatan/:jabId",
  protected,
  adminDosenOnly,
  profileUpload,
  editDataJabatan
);
router.delete(
  "/deleteDataJabatan/:jabId",
  protected,
  adminDosenOnly,
  deleteDataJabatan
);
router.patch(
  "/approveStatusJabatan/:jabId",
  protected,
  adminOnly,
  approveStatusJabatan
);
router.patch(
  "/rejectStatusJabatan/:jabId",
  protected,
  adminOnly,
  rejectStatusJabatan
);
// =============== END JABATAN DOSEN ================

// =============== KEPANGKATAN DOSEN ================
router.post(
  "/addKepangkatan",
  protected,
  adminDosenOnly,
  profileUpload,
  addDataKepangkatan
);
router.get(
  "/getDataKepangkatan",
  protected,
  adminDosenOnly,
  getDataKepangkatan
);
router.get(
  "/detailDataPangkat/:pangkatId",
  protected,
  adminDosenOnly,
  detailDataKepangkatan
);
router.patch(
  "/editPangkat/:pangkatId",
  protected,
  adminDosenOnly,
  profileUpload,
  editDataKepangkatan
);
router.delete(
  "/deletePangkat/:pangkatId",
  protected,
  adminDosenOnly,
  deleteDataKepangkatan
);
router.patch(
  "/approveStatusPangkat/:pangkatId",
  protected,
  adminOnly,
  approveStatusKepangkatan
);
router.patch(
  "/rejectStatusPangkat/:pangkatId",
  protected,
  adminOnly,
  rejectStatusKepangkatan
);
// ============== END KEPANGAKATAN DOSEN ==================

module.exports = router;
