const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const { getDataPembelejaran } = require("../../controllers/absensi/absensiController");


const router = express.Router();

router.get("/get-pembelajaran", getDataPembelejaran);

module.exports = router;
