const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const RuanganController = require("../../controllers/ruangan/ruanganController");
const router = express.Router();

router.get("/", protected, adminOnly, RuanganController.index);
router.get("/:id", protected, RuanganController.detail);
router.post("/", protected, adminOnly, RuanganController.create);
router.put("/:id", protected, adminOnly, RuanganController.update);
router.delete("/:id", protected, adminOnly, RuanganController.destroy);

module.exports = router;
