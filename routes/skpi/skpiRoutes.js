const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const { getSertifikasiSkpi, getBahasaAsing } = require("../../controllers/skpi/kompetensiController");
const { getPengalamanOrganisasiSkpi, getPrestasiSkpi } = require("../../controllers/skpi/penunjangController");


const router = express.Router();

router.get("/sertifikasi", protected, getSertifikasiSkpi);
router.get("/bahasa", protected, getBahasaAsing);
router.get("/organisasi", protected, getPengalamanOrganisasiSkpi);
router.get("/prestasi", protected, getPrestasiSkpi);

module.exports = router;
