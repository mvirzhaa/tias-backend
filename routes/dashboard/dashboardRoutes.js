const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  dashboardData,
} = require("../../controllers/dashboard/dashboardController");

const router = express.Router();

router.get("/", protected, dashboardData);

module.exports = router;
