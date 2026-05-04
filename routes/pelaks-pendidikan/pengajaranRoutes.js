const express = require("express");
const { protected } = require("../../middleware/authMiddleware");

const router = express.Router();

// ============= PENELITIAN ======================
router.post(
  "/pengajran",
  protected,
  dokumenPenelitianUpload,
  addDataPenelitian
);
// router.get("/getDatapenelitian", protected, getDataPenelitian);
// router.get("/detailPenelitian/:penelitianId", protected, detailDataPenelitian);
// router.patch(
//   "/editPenelitian/:penelitianId",
//   protected,
//   dokumenPenelitianUpload,
//   editDataPenelitian
// );
// router.delete(
//   "/deletePenelitian/:penelitianId",
//   protected,
//   deleteDataPenelitian
// );

// ============= END PENELITIAN =====================

module.exports = router;
