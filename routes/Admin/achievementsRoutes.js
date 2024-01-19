const express = require("express");
const { protected, adminOnly, mhsOnly } = require("../../middleware/authMiddleware");
const { getAchivements, getAchivementsByUserLoginId, getAchivementsByUserId, addAchievement, deleteAchievement, editAchievement, getAchievementDetail, updateUserAchievementStatus } = require("../../controllers/Admin/achievementsController");
const router = express.Router();

router.get("/", protected, adminOnly, getAchivements); 
router.get("/detail/:id", protected, adminOnly, getAchievementDetail); 
router.post("/", protected, adminOnly, addAchievement); 
router.delete("/:id", protected, adminOnly, deleteAchievement); 
router.patch("/:id", protected, adminOnly, editAchievement); 
router.post("/update-status", protected, adminOnly, updateUserAchievementStatus); 


router.get("/by-mhsLoginId", protected, mhsOnly, getAchivementsByUserLoginId); 
router.get("/by-mhsId/:userId", protected, getAchivementsByUserId); 

module.exports = router;
