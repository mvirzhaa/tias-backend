const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");

const {
  getJabatan,
  detailJabatan,
  createJabatan,
  deleteJabatan,
  editJabatan,
} = require("../../controllers/jabatan/jabatanMasterController");

const router = express.Router();

router.get("/", protected, adminOnly, getJabatan);
router.get("/:id", protected, adminOnly, detailJabatan);
router.post("/", protected, adminOnly, createJabatan);
router.delete("/:id", protected, adminOnly, deleteJabatan);
router.put("/:id", protected, adminOnly, editJabatan);

module.exports = router;
