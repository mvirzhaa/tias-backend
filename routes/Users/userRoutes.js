const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
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
  importDataDosenAgain,
  getUsersAndGroup,
  getListUsers,
} = require("../../controllers/Users/usersController");
const formidable = require("../../middleware/functional/formidable");
const JabatanStrukturalController = require("../../controllers/Users/jabatanStrukturalController");

const router = express.Router();

router.post("/import-pegawai", formidable, importDataPegawai);
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
router.post("/import-dosen-again", protected, formidable, importDataDosenAgain);

router.get(
  "/jabatan-struktural",
  protected,
  adminOnly,
  JabatanStrukturalController.index
);

router.get("/dosen-faculty", JabatanStrukturalController.getDosenJabatan);
router.get(
  "/all-dosen-faculty",
  JabatanStrukturalController.getAllDosenJabatan
);

router.get("/staff-faculty", JabatanStrukturalController.getPegawaiJabatan);
router.get(
  "/all-staff-faculty",
  JabatanStrukturalController.getAllPegawaiJabatan
);

router.get(
  "/user-jabatan",
  protected,
  JabatanStrukturalController.getByUserLogin
);
router.get(
  "/jabatan-struktural/:id",
  protected,
  adminOnly,
  JabatanStrukturalController.detail
);
router.post(
  "/jabatan-struktural",
  protected,
  adminOnly,
  JabatanStrukturalController.create
);
router.put(
  "/jabatan-struktural/:id",
  protected,
  adminOnly,
  JabatanStrukturalController.update
);
router.delete(
  "/jabatan-struktural/:id",
  protected,
  adminOnly,
  JabatanStrukturalController.destroy
);

router.get("/get-users-group", protected, getUsersAndGroup);

router.get("/list-users", protected, getListUsers);

module.exports = router;
