const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const { getSertifikasiSkpi } = require("../../controllers/skpi/kompetensiController");


const router = express.Router();

router.get("/sertifikasi", protected, getSertifikasiSkpi);

module.exports = router;
