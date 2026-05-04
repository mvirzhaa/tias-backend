const express = require("express");
const { protected, adminOnly, adminMhsOnly } = require("../../middleware/authMiddleware");
const { getAchivements, getAchivementsByUserLoginId, getAchivementsByUserId, addAchievement, deleteAchievement, editAchievement, getAchievementDetail, updateUserAchievementStatus } = require("../../controllers/Admin/achievementsController");
const { gamifyUpload } = require("../../middleware/gamifyUpload");
const router = express.Router();

router.get("/", protected, getAchivements); 
router.get("/detail/:id", protected, adminOnly, getAchievementDetail); 
router.post("/", protected, adminOnly, gamifyUpload, addAchievement); 
router.delete("/:id", protected, adminOnly, deleteAchievement); 
router.patch("/:id", protected, adminOnly, gamifyUpload, editAchievement); 
router.post("/update-status", protected, adminOnly, updateUserAchievementStatus); 


router.get("/by-mhsLoginId", protected, getAchivementsByUserLoginId); 
router.get("/by-mhsId/:userId", protected, getAchivementsByUserId); 

module.exports = router;
