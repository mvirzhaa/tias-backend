const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  getUserMhs,
  getUserDosen,
  detailUser,
  getInformaticsStudent,
  getDosenInfromatics,
  changePaswordUser,
  getIpMhs,
  getKategoriIp,
} = require("../../controllers/Users/usersController");

const router = express.Router();

router.get("/getMhs", protected, getUserMhs);
router.get("/getDosen", protected, getUserDosen);
router.get("/detail-user/:userId", protected, detailUser);
router.patch("/change-password/:userId", protected, changePaswordUser);

router.get("/get-mhs-ti", protected, getInformaticsStudent);
router.get("/get-dosen-ti", getDosenInfromatics);
router.get("/get-ip",  protected, getIpMhs);
router.get("/get-ip-kategori", protected, getKategoriIp);

module.exports = router;
