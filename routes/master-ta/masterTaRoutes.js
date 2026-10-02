const express = require("express");
const { protected, adminOnly, mhsOnly } = require("../../middleware/authMiddleware");
const SkemaController = require("../../controllers/master-ta/skemaController");
const TahapanController = require("../../controllers/master-ta/tahapanController");
const PenilaianController = require("../../controllers/master-ta/penilaianController");
const ProdiController = require("../../controllers/master-ta/prodiController");
const PengajuanController = require("../../controllers/master-ta/pengajuanController");

const router = express.Router();

// Prodi (dari data SIAK v2, hanya untuk dropdown di layar admin)
router.get("/prodi", protected, adminOnly, ProdiController.index);

// Skema TA
router.get("/skema", protected, adminOnly, SkemaController.index);
router.get("/skema/all", protected, SkemaController.listAll);
router.get("/skema/:id", protected, adminOnly, SkemaController.detail);
router.post("/skema", protected, adminOnly, SkemaController.create);
router.put("/skema/:id", protected, adminOnly, SkemaController.update);
router.delete("/skema/:id", protected, adminOnly, SkemaController.destroy);

// Tahapan TA
router.get("/tahapan", protected, adminOnly, TahapanController.index);
router.get("/tahapan/:id", protected, adminOnly, TahapanController.detail);
router.post("/tahapan", protected, adminOnly, TahapanController.create);
router.put("/tahapan/:id", protected, adminOnly, TahapanController.update);
router.delete("/tahapan/:id", protected, adminOnly, TahapanController.destroy);

// Model Penilaian TA
router.get("/penilaian", protected, adminOnly, PenilaianController.index);
router.get("/penilaian/:id", protected, adminOnly, PenilaianController.detail);
router.post("/penilaian", protected, adminOnly, PenilaianController.create);
router.put("/penilaian/:id", protected, adminOnly, PenilaianController.update);
router.delete("/penilaian/:id", protected, adminOnly, PenilaianController.destroy);

// Pengajuan TA
router.post("/pengajuan", protected, mhsOnly, PengajuanController.create);
router.get("/pengajuan/me", protected, mhsOnly, PengajuanController.myList);
router.get("/pengajuan", protected, adminOnly, PengajuanController.index);
router.get("/pengajuan/:id", protected, adminOnly, PengajuanController.detail);
router.put(
  "/pengajuan/:id/status",
  protected,
  adminOnly,
  PengajuanController.updateStatus
);
router.delete("/pengajuan/:id", protected, adminOnly, PengajuanController.destroy);

module.exports = router;
