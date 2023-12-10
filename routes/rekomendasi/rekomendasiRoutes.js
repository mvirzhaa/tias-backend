const express = require("express");
const {
  protected,
  dosenOnly,
  mhsOnly,
} = require("../../middleware/authMiddleware");
const {
  addRekomendasi,
  editRekomendasi,
  getRekomendasiByUserLogin,
} = require("../../controllers/rekomendasi/rekomendasiController");

const router = express.Router();

// ============= REKOMENDASI Dosen ======================
router.post("/add", protected, dosenOnly, addRekomendasi);
router.patch("/edit/:id", protected, dosenOnly, editRekomendasi);
// ============= END REKOMENDASI ==================

// ============= REKOMENDASI Mahasiswa ======================
router.get("/get", protected, mhsOnly, getRekomendasiByUserLogin);
// ============= END REKOMENDASI ==================

module.exports = router;
