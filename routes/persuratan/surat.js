const express = require("express");
const router = express.Router();
const { protected } = require("../../middleware/authMiddleware");
const SuratController = require("../../controllers/persuratan/SuratController");
const SuratValidator = require("../../middleware/persuratan/SuratValidator");
const { persuratanUpload } = require("../../middleware/persuratan/persuratanUpload");

// --- Route with Validator ---
router.post("/", protected, persuratanUpload, SuratValidator.create, SuratController.create);

router.post("/disposisi/:id", protected, persuratanUpload, SuratValidator.disposisi, SuratController.disposisi);

router.put("/status/:id", protected, SuratValidator.updateStatus, SuratController.updateStatus);

// --- Standard Routes (Without using Validator) ---
router.get("/qr/:id", SuratController.getQr); // Public: no auth required (QR validation)
router.get("/", protected, SuratController.index);
router.get("/tracking/:id", protected, SuratController.getTracking);
router.get("/:id", protected, SuratController.detail);
router.delete("/:id", protected, SuratController.delete);

module.exports = router;
