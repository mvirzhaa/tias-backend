const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  getUserMhs,
  getUserDosen,
  detailUser,
  changePaswordUser,
  getTotalUsers,
} = require("../../controllers/Users/usersController");

const router = express.Router();

router.get("/getMhs", protected, getUserMhs);
router.get("/getDosen", protected, getUserDosen);
router.get("/detail-user/:userId", protected, detailUser);
router.patch("/change-password/:userId", protected, changePaswordUser);
router.patch("/total-data", protected, getTotalUsers);

module.exports = router;
