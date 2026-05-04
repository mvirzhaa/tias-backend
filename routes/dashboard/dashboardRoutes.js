const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  dashboardData,
  dashboardDataAdmin,
  dashboardMobileDosen,
  dashboardDataPegawai,
} = require("../../controllers/dashboard/dashboardController");

const router = express.Router();

router.get("/", protected, dashboardData);
router.get("/admin", protected, dashboardDataAdmin);
router.get("/pegawai", protected, dashboardDataPegawai);

router.get("/mobile-dosen", protected, dashboardMobileDosen);

module.exports = router;
