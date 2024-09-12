const express = require("express");
const {
  protected,
  adminDosenOnly,
  adminOnly,
} = require("../../middleware/authMiddleware");
const {
  addDataBimbinganAkademik,
  getDataBimbingan,
  detailDataBimbingan,
  deleteDataBimbingan,
  deleteMhsBimbingan,
  updateForAdmin,
  updateForDosen,
  updateForMhs,
  importDataBimbingan,
  getDataBimbinganForAdmin,
} = require("../../controllers/bimbingan/bimbinganAkademikController");
const { frsUpload } = require("../../middleware/dokumen-frs");
const {
  ImportBk,
} = require("../../middleware/pelaks-pendidikan/bimbinganAkademikUpload");

const router = express.Router();

router.get("/for-admin", protected, getDataBimbinganForAdmin);

router.post("/add", protected, adminOnly, addDataBimbinganAkademik);
router.get("/get", protected, getDataBimbingan);
router.get("/:id", protected, detailDataBimbingan);
router.delete("/:id", protected, deleteDataBimbingan);
router.patch("/:id", protected, updateForAdmin);
router.patch("/edit-dosen/:id", protected, updateForDosen);
router.patch("/edit-mhs/:id", protected, frsUpload, updateForMhs);

router.delete("/mhs-bimbingan/:id", protected, deleteMhsBimbingan);

router.post("/import", ImportBk, importDataBimbingan);

module.exports = router;
