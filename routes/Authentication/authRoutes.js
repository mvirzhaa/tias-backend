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
  registerPegawai,
  eportalGoogle,
  verifyByAdmin,
} = require("../../controllers/Authentication/authController");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const passport = require("../../utils/passport");
const { generateToken } = require("../../utils");
const DB = require("../../database");

const router = express.Router();

router.post("/register", register);
router.post("/register-pmm", registerMhsPmm);
router.post("/register-dosen-ext", registerDosenExt);
router.post("/register-pegawai", registerPegawai);
router.post("/login", loginUser);
router.get("/cekDataPribadi/:id", cekDataPribadi);
router.post("/sendLoginCode/:email", sendLoginCode);
router.post("/loginWithCode/:email", loginWithCode);

router.post("/sendVerificationEmail", protected, sendVerificationEmail);
router.patch("/verifyUser/:verificationToken", verifyUser);
router.get("/verifyUser/:verificationToken", verifyUser);
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

router.post("/eportal/google", eportalGoogle);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", async (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.redirect(`${process.env.FRONTEND_REDIRECT_URL}/login?error=invalid`);
    } else if (user && !user.isverified) {
      res.redirect(`${process.env.FRONTEND_REDIRECT_URL}/login?error=not_verified`);
    } else {
      try {
        const token = generateToken(user.user_id);
        const oneMonth = 30 * 24 * 60 * 60 * 1000;

        res.cookie("token", token, {
          path: "/",
          httpOnly: true,
          expires: new Date(Date.now() + oneMonth),
          sameSite: "none",
          secure: true,
        });

        const getPersonalData = await DB.query(
          "SELECT nip, nama_lengkap, image, total_point, kode_mhs FROM tb_data_pribadi WHERE user_id = $1",
          [user.user_id]
        );

        const personalData = getPersonalData.rows[0];

        res.redirect(
          `${process.env.FRONTEND_REDIRECT_URL}/oauth/callback?token=${token}&user_id=${user.user_id}&npm=${user.npm}&nidn=${user.nidn}&username=${user.username}&email=${user.email}&role=${user.role}&nip=${personalData.nip}&nama_lengkap=${personalData.nama_lengkap}&image=${personalData.image}&no_hp=${personalData.no_hp}&imageUrl=${process.env.API_URL}/foto-profile/${personalData.image}&kode_mhs=${personalData.kode_mhs}&isverified=${user.isverified}&created_at=${user.created_at}`
        );
      } catch (error) {
        res.redirect(`${process.env.FRONTEND_REDIRECT_URL}/login?error=auth_failed`);
      }
    }
  })(req, res, next);
});

router.put("/verify-by-admin/:user_id", protected, verifyByAdmin);

module.exports = router;
