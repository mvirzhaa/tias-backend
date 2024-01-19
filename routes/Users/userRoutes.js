const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  getUserMhs,
  getUserDosen,
  detailUser,
  getInformaticsStudent,
  getDosenInfromatics,
  changePaswordUser,
} = require("../../controllers/Users/usersController");

const router = express.Router();

router.get("/getMhs", protected, getUserMhs);
router.get("/getDosen", protected, getUserDosen);
router.get("/detail-user/:userId", protected, detailUser);
router.patch("/change-password/:userId", protected, changePaswordUser);

router.get("/get-mhs-ti", getInformaticsStudent);
router.get("/get-dosen-ti", getDosenInfromatics);

module.exports = router;
