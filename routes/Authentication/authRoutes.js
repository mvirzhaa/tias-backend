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
} = require("../../controllers/Authentication/authController");
const { protected, adminOnly } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", loginUser);
router.get("/cekDataPribadi/:id", cekDataPribadi);
router.post("/sendLoginCode/:email", sendLoginCode);
router.post("/loginWithCode/:email", loginWithCode);

router.post("/sendVerificationEmail", protected, sendVerificationEmail);
router.patch("/verifyUser/:verificationToken", verifyUser);
router.get("/loginStatus", getLoginStatus);
router.get("/logout", logout);

router.get("/getAllUsers", protected, adminOnly, getAllUsers);
router.patch("/updateUserLogin", protected, updateUserLogin);
router.delete("/:id", protected, adminOnly, deleteUser);
router.post("/forgotPassword", forgotPassword);

router.patch("/resetPassword/:resetToken", resetPassword);
router.patch("/changePassword", protected, changePassword);

router.post("/sendAutomatedEmail", protected, sendAutomatedEmail);

router.get("/deleteExpired", deleteExpired);

module.exports = router;
