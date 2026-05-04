const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const UjianController = require("../../controllers/ujian/UjianController");

const router = express.Router();

router.get("/", protected, UjianController.index);
router.get("/soal", protected, UjianController.soal);
router.post("/submit", protected, UjianController.submit);

module.exports = router;
