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
  getUserMhsAgain,
  getUserDosenAgain,
  getUsers,
  changeEmail,
  getUsersForNotaDinas,
  getUserDosenExt,
  getMhsBeasiswa,
} = require("../../controllers/Users/usersController");

const router = express.Router();

router.get("/getMhs", protected, getUserMhs);
router.get("/getDosen", protected, getUserDosen);
router.get("/get-dosen-ext", protected, getUserDosenExt);
router.get("/detail-user/:userId", protected, detailUser);
router.patch("/change-password/:userId", protected, changePaswordUser);
router.patch("/change-email/:userId", protected, changeEmail);
router.get("/total-data", protected, getTotalUsers);
router.get("/papan-peringkat", protected, papanPeringkat);
router.get("/all", protected, getUsesDsnMhs);
router.get("/all-mhs", protected, getUserMhsAgain);
router.get("/all-dosen", getUserDosenAgain);
router.get("/all-dosen-ext", protected, getUserDosenExt);
router.get("/all-users", getUsers);
router.get("/all-mhs-beasiswa", protected, getMhsBeasiswa);

router.get("/all-mhs-skripsi", protected, getUsersForNotaDinas);

module.exports = router;
