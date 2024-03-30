const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");

const {
  getStruktural,
  detailStruktural,
  tambahStruktural,
  deleteStruktural,
  editStruktural,
} = require("../../controllers/jabatan/strukturalProdiController");

const router = express.Router();

router.get("/", protected, adminOnly, getStruktural);
router.get("/:id", protected, adminOnly, detailStruktural);
router.post("/", protected, adminOnly, tambahStruktural);
router.delete("/:id", protected, adminOnly, deleteStruktural);
router.put("/:id", protected, adminOnly, editStruktural);

module.exports = router;
