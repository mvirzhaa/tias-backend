const express = require("express");
const { getDataPrestasi } = require("../../controllers/skpi/prestasi");


const router = express.Router();

router.get("/get-prestasi", getDataPrestasi);

module.exports = router;
