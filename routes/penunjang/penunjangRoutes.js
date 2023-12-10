const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const { penunjangUpload } = require("../../middleware/penunjangUpload");
const {
  addDataProfesi,
  getAllDataProfesi,
  detailDataProfesi,
  editDataProfesi,
  deleteDataProfesi,
  filterDataProfesi,
  approveStatusProfesi,
  rejectStatusProfesi,
} = require("../../controllers/penunjang/anggotaProfesiController");
const {
  addPenghargaan,
  getPenghargaan,
  detailPenghargaan,
  editPenghargaan,
  deletePenghargaan,
  approveStatusPenghargaan,
  rejectStatusPenghargaan,
} = require("../../controllers/penunjang/penghargaanController");

const router = express.Router();

// ============= PROFESI ======================
router.post("/addProfesi", protected, penunjangUpload, addDataProfesi);
router.get("/getProfesi", protected, getAllDataProfesi);
router.get("/detailProfesi/:profId", protected, detailDataProfesi);
router.patch(
  "/editProfesi/:profId",
  protected,
  penunjangUpload,
  editDataProfesi
);
router.delete("/deleteProfesi/:profId", protected, deleteDataProfesi);
router.patch(
  "/approveStatusProf/:profId",
  protected,
  adminOnly,
  approveStatusProfesi
);
router.patch(
  "/rejectStatusProf/:profId",
  protected,
  adminOnly,
  rejectStatusProfesi
);
router.get("/filterProfesi", protected, filterDataProfesi);
// ============= END PROFESI ==================

// ================== Penghargaan ======================
router.post("/addPenghargaan", protected, penunjangUpload, addPenghargaan);
router.get("/getPenghargaan", protected, getPenghargaan);
router.get("/detailPenghargaan/:pengId", protected, detailPenghargaan);
router.patch(
  "/editPenghargaan/:pengId",
  protected,
  penunjangUpload,
  editPenghargaan
);
router.delete("/deletePenghargaan/:pengId", protected, deletePenghargaan);
router.patch(
  "/approveStatusPenghargaan/:pengId",
  protected,
  adminOnly,
  approveStatusPenghargaan
);
router.patch(
  "/rejectStatusPenghargaan/:pengId",
  protected,
  adminOnly,
  rejectStatusPenghargaan
);
// ================== END TES ==================

module.exports = router;
