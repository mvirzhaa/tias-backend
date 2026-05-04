const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  addKolaborator,
  getKolaborator,
  editKolaborator,
  deleteKolaborator,
  detailKolaborator,
} = require("../../controllers/kolaborator-external/kolabExternalController");
const router = express.Router();

// ============= SERTIFIKAT ======================
router.post("/addKolab", protected, addKolaborator);
router.get("/getKolab", protected, getKolaborator);
router.get("/detailKolab/:extId", protected, detailKolaborator);
router.patch("/editKolab/:extId", protected, editKolaborator);
router.delete("/deleteKolab/:extId", protected, deleteKolaborator);
// ============= END SERTIFIKAT ==================

module.exports = router;
