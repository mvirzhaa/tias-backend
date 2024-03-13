const express = require("express");
const {
  protected,
  adminDosenOnly,
  adminOnly,
} = require("../../middleware/authMiddleware");
const {
  addDataBimbinganAkademik,
} = require("../../controllers/bimbingan/bimbinganAkademikController");

const router = express.Router();

router.post("/add", protected, adminOnly, addDataBimbinganAkademik);

module.exports = router;
