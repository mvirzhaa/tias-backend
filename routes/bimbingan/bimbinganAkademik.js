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
} = require("../../controllers/bimbingan/bimbinganAkademikController");

const router = express.Router();

router.post("/add", protected, adminOnly, addDataBimbinganAkademik);
router.get("/get", protected, getDataBimbingan);
router.get("/:id", protected, detailDataBimbingan);
router.delete("/:id", protected, deleteDataBimbingan);

router.delete("mhs-bimbingan/:id", protected, deleteDataBimbingan);

module.exports = router;
