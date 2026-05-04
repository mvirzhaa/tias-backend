const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const RuanganController = require("../../controllers/ruangan/ruanganController");
const { ruanganUpload } = require("../../middleware/ruanganUpload");

const router = express.Router();

router.get("/", protected, adminOnly, RuanganController.index);
router.get("/all", protected, adminOnly, RuanganController.all);
router.get("/:id", protected, RuanganController.detail);
router.post("/", protected, adminOnly, ruanganUpload, RuanganController.create);
router.put(
  "/:id",
  protected,
  adminOnly,
  ruanganUpload,
  RuanganController.update
);
router.delete("/:id", protected, adminOnly, RuanganController.destroy);

module.exports = router;
