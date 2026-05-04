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
router.get("/", protectedParents, ParentsController.getUserLogin);
router.post("/import", formidable, ParentsController.importParent);
router.post("/login", ParentsController.login);
router.post("/send-login-code", ParentsController.sendLoginCode);
router.post("/login-code", ParentsController.loginWithCode);

module.exports = router;
