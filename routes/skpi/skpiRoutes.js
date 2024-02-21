const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const { getSertifikasiSkpi, getBahasaAsing } = require("../../controllers/skpi/kompetensiController");


const router = express.Router();

router.get("/sertifikasi", protected, getSertifikasiSkpi);
router.get("/bahasa", protected, getBahasaAsing);

module.exports = router;
