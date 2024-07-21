const express = require("express");
const {
  register,
  loginUser,
  logout,
  updateUserLogin,
  deleteUser,
  sendLoginCode,
  loginWithCode,
  sendVerificationEmail,
  verifyUser,
  getLoginStatus,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteExpired,
  getAllUsers,
  sendAutomatedEmail,
  cekDataPribadi,
  getUserLogin,
  registerMhsPmm,
  registerDosenExt,
  verifyDosenExt,
} = require("../../controllers/Authentication/authController");
const { protected, adminOnly } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/register-pmm", registerMhsPmm);
router.post("/register-dosen-ext", registerDosenExt);
router.post("/login", loginUser);
router.get("/cekDataPribadi/:id", cekDataPribadi);
router.post("/sendLoginCode/:email", sendLoginCode);
router.post("/loginWithCode/:email", loginWithCode);

router.post("/sendVerificationEmail", protected, sendVerificationEmail);
router.patch("/verifyUser/:verificationToken", verifyUser);
router.patch("/verify-dosen-ext/:userId", verifyDosenExt);
router.get("/loginStatus", getLoginStatus);
router.get("/logout", logout);

router.get("/getAllUsers", protected, adminOnly, getAllUsers);
router.get("/get-user/:id", protected, getUserLogin);
router.patch("/updateUserLogin", protected, updateUserLogin);
router.delete("/:id", protected, adminOnly, deleteUser);
router.post("/forgotPassword", forgotPassword);

router.patch("/resetPassword/:resetToken", resetPassword);
router.patch("/changePassword", protected, changePassword);

router.post("/sendAutomatedEmail", protected, sendAutomatedEmail);

router.get("/deleteExpired", deleteExpired);

module.exports = router;
