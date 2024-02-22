const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  getUserMhs,
  getUserDosen,
  detailUser,
  changePaswordUser,
  getTotalUsers,
  papanPeringkat,
  getUsesDsnMhs,
} = require("../../controllers/Users/usersController");

const router = express.Router();

router.get("/getMhs", protected, getUserMhs);
router.get("/getDosen", protected, getUserDosen);
router.get("/detail-user/:userId", protected, detailUser);
router.patch("/change-password/:userId", protected, changePaswordUser);
router.get("/total-data", protected, getTotalUsers);
router.get("/papan-peringkat", protected, papanPeringkat);
router.get("/all", protected, getUsesDsnMhs);

module.exports = router;
