const express = require("express");
const {
  protected,
  adminDosenOnly,
  adminOnly,
} = require("../../middleware/authMiddleware");
const {
  pengajuanSk,
  getByUserLogin,
  getForAdmin,
  getForDosen,
  detailPengajuanSk,
  detailPengajuanSkForDosen,
  approvedStatus,
  updatePengajuanSk,
} = require("../../controllers/bimbingan/tugasAkhirController");

const router = express.Router();

router.post("/", protected, pengajuanSk);
router.get("/detail/:id", protected, detailPengajuanSk);
router.get("/detail-for-dosen/:id", protected, detailPengajuanSkForDosen);
router.get("/get-by-mhs", protected, getByUserLogin);
router.get("/get-for-admin", protected, adminOnly, getForAdmin);
router.get("/get-for-dosen", protected, getForDosen);
router.put("/approve/:id", approvedStatus);

router.patch("/update-sk/:id", protected, updatePengajuanSk);

module.exports = router;
