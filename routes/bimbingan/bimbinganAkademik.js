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
} = require("../../controllers/bimbingan/bimbinganAkademikController");

const router = express.Router();

router.post("/add", protected, adminOnly, addDataBimbinganAkademik);
router.get("/get", protected, getDataBimbingan);
router.get("/:id", protected, detailDataBimbingan);
router.delete("/:id", protected, deleteDataBimbingan);
router.patch("/:id", protected, updateForAdmin);
router.patch("/edit-dosen/:id", protected, updateForDosen);

router.delete("/mhs-bimbingan/:id", protected, deleteMhsBimbingan);

module.exports = router;
