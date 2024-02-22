const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const { storeMeeting } = require("../../controllers/jadwal-rapat/jadwalRapatController");


const router = express.Router();

router.post("/store", storeMeeting);

module.exports = router;
