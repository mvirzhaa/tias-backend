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
  getUsers,
  changeEmail,
  getUsersForNotaDinas,
  getUserDosenExt,
  getMhsBeasiswa,
  listDosen,
  listDosenExt,
  importDataDosen,
  importDataPegawai,
  getPegawai,
} = require("../../controllers/Users/usersController");
const formidable = require("../../middleware/functional/formidable");

const router = express.Router();

router.get("/getMhs", protected, getUserMhs);
router.get("/getDosen", protected, getUserDosen);
router.get("/get-dosen-ext", protected, getUserDosenExt);
router.get("/get-pegawai", getPegawai);
router.get("/detail-user/:userId", protected, detailUser);
router.patch("/change-password/:userId", protected, changePaswordUser);
router.patch("/change-email/:userId", protected, changeEmail);
router.get("/total-data", protected, getTotalUsers);
router.get("/papan-peringkat", protected, papanPeringkat);
router.get("/all", protected, getUsesDsnMhs);
router.get("/all-mhs", protected, getUserMhsAgain);
router.get("/all-dosen", protected, listDosen);
router.get("/all-dosen-ext", protected, listDosenExt);
router.get("/all-users", protected, getUsers);
router.get("/all-mhs-beasiswa", protected, getMhsBeasiswa);

router.get("/all-mhs-skripsi", protected, getUsersForNotaDinas);
router.post("/import-dosen", protected, formidable, importDataDosen);
router.post("/import-pegawai", protected, formidable, importDataPegawai);

module.exports = router;
