const express = require("express");
const {
  protected,
  adminDosenOnly,
  adminOnly,
} = require("../../middleware/authMiddleware");
const {
  addDataBimbingan,
  detailDataBimbingan,
  getDataBimbingan,
  editDataBimbingan,
  deleteDataBimbingan,
  approveStatusBimbingan,
  rejectStatusBimbingan,
} = require("../../controllers/pelaks-pendidikan/bimbinganController");

const router = express.Router();

// ============= PENELITIAN ======================

router.post("/add", protected, adminDosenOnly, addDataBimbingan);
router.get("/get", protected, adminDosenOnly, getDataBimbingan);
router.get(
  "/detail/:bimbinganId",
  protected,
  adminDosenOnly,
  detailDataBimbingan
);
router.patch(
  "/edit/:bimbinganId",
  protected,
  adminDosenOnly,
  editDataBimbingan
);
router.delete(
  "/delete/:bimbinganId",
  protected,
  adminDosenOnly,
  deleteDataBimbingan
);
router.patch(
  "/approveStatus/:bimbinganId",
  protected,
  adminOnly,
  approveStatusBimbingan
);

router.patch(
  "/rejectStatus/:bimbinganId",
  protected,
  adminOnly,
  rejectStatusBimbingan
);
// ============= END PENELITIAN =====================

module.exports = router;
