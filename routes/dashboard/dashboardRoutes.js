const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  dashboardData, dashboardDataAdmin,
} = require("../../controllers/dashboard/dashboardController");

const router = express.Router();

router.get("/", protected, dashboardData);
router.get("/admin", protected, dashboardDataAdmin);

module.exports = router;
