const express = require("express");
const {
  protected,
  adminOnly,
  protectedParents,
} = require("../../middleware/authMiddleware");
const ParentsController = require("../../controllers/parents/parentsController");
const formidable = require("../../middleware/functional/formidable");

const router = express.Router();

// router.get("/", ParentsController.exportExcelMhs);
router.get("/get-profile", protectedParents, ParentsController.getUserLogin);
router.put("/edit-profile", protectedParents, ParentsController.editProfile);
router.post("/register", ParentsController.register);
router.post("/import", formidable, ParentsController.importParent);
router.post("/login", ParentsController.login);
router.post("/send-login-code", ParentsController.sendLoginCode);
router.post("/login-code", ParentsController.loginWithCode);
router.get("/kompetensi/:npm", protectedParents, ParentsController.getKompetensiMhs);
router.get("/penunjang/:npm", protectedParents, ParentsController.getPenunjangMhs);
router.get("/pengabdian/:npm", protectedParents, ParentsController.getPengabdianMhs);
router.get("/kkn/:npm", protectedParents, ParentsController.getKknMhs);
router.get("/skripsi/:npm", protectedParents, ParentsController.getSkripsiMhs);
router.get("/absensi-matkul/:npm/:kode", protectedParents, ParentsController.getAbsensiMatkul);
router.get("/all-dosen", protectedParents, ParentsController.getAllDosen);

// --- ADMIN MANAGEMENT ROUTES ---
router.get("/admin/list", protected, adminOnly, ParentsController.getAllParents);
router.get("/admin/detail/:id", protected, adminOnly, ParentsController.getDetailParentByAdmin);
router.put("/admin/update/:id", protected, adminOnly, ParentsController.updateParentByAdmin);
router.delete("/admin/delete/:id", protected, adminOnly, ParentsController.deleteParentByAdmin);

module.exports = router;
