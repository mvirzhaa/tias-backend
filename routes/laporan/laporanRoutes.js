const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const LaporanController = require("../../controllers/laporan/laporanController");
const { laporanUpload } = require("../../middleware/laporanUpload");
const router = express.Router();

router.get("/", protected, LaporanController.index);
router.get("/sebaran", protected, LaporanController.petaSebaran);
router.get("/chart", protected, LaporanController.dataChart);
router.get("/:id", protected, LaporanController.detail);
router.post("/", protected, laporanUpload, LaporanController.create);
router.put("/:id", protected, laporanUpload, LaporanController.update);
router.delete("/:id", protected, LaporanController.destroy);

module.exports = router;
