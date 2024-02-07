const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const { beritaUpload } = require("../../middleware/beritaUpload");
const {create, update, deleteBerita, getDataEvent, getDataTantangan, detail, editStatus, getActiveEvent, getActiveTantangan } = require("../../controllers/Admin/beritaController");
const router = express.Router();


router.get("/tantangan", protected, adminOnly, getDataTantangan); 
router.get("/event",protected, adminOnly, getDataEvent); 
router.get("/active-event", getActiveEvent); 
router.get("/active-tantangan", getActiveTantangan); 
router.post("/",protected, adminOnly, beritaUpload, create); 
router.patch("/:id",protected, adminOnly, beritaUpload, update); 
router.delete("/:id",protected, adminOnly, deleteBerita); 
router.get("/detail/:id",protected, detail); 

router.patch("/change-status/:id", protected, adminOnly, editStatus); 


module.exports = router;
