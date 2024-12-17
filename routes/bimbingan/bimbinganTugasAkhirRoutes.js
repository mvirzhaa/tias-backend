const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  getProgesTaForDosen,
  getListProgesTaForDosen,
  createProgesTaForDosen,
  detailProgesTaForDosen,
  updateProgesTaForDosen,
  deleteProgesTaForDosen,
  getProgesTaForMhs,
  getListAdminProgresTa,
  getListAdminProgresTaDosen,
} = require("../../controllers/bimbingan/bimbinganTugasAkhirController");

const router = express.Router();

router.get("/get-for-dosen", protected, getProgesTaForDosen);
router.get("/get-for-mhs", protected, getProgesTaForMhs);
router.get("/get-for-admin", protected, getListAdminProgresTa);
router.get(
  "/list-progres-dosen/:userId",
  protected,
  getListAdminProgresTaDosen
);
router.get("/list-progres/:id", protected, getListProgesTaForDosen);
router.post("/create-progres", protected, createProgesTaForDosen);
router.get("/detail-progres/:id", protected, detailProgesTaForDosen);
router.put("/update-progres/:id", protected, updateProgesTaForDosen);
router.delete("/delete-progres/:id", protected, deleteProgesTaForDosen);

module.exports = router;
