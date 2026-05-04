const express = require("express");
const MasterController = require("../../controllers/siak/MasterController");

const router = express.Router();

router.get("/lecturer", MasterController.lecturer);
router.get("/course", MasterController.course);
router.get("/curriculum", MasterController.curriculum);
router.get("/class", MasterController.class);

module.exports = router;
