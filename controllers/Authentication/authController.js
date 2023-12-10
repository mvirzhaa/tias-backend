const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const {
  formRegisterValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require("../../validation/formValidation");
const bcrypt = require("bcryptjs");
const parser = require("ua-parser-js");
const {
  generateToken,
  hashToken,
  unixTimestamp,
  convertDate,
  expires_at,
} = require("../../utils");
const sendMail = require("../../utils/sendMail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
// Triger 2FA
const Cryptr = require("cryptr");
const sendEmail = require("../../utils/sendMail");
const cryptr = new Cryptr(process.env.CRYPTR_KEY);

exports.register = asyncHandler(async (req, res) => {
  const { error } = formRegisterValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { npm_nidn, email, password } = req.body;

  const npmExists = await DB.query("SELECT * FROM tb_users WHERE npm = $1", [
    npm_nidn,
  ]);
  if (npmExists.rows.length) {
    res.status(400);
    throw new Error("NPM already exists.");
  }

  const nidnExists = await DB.query("SELECT * FROM tb_users WHERE nidn = $1", [
    npm_nidn,
  ]);

  if (nidnExists.rows.length) {
    res.status(400);
    throw new Error("NIDN already exists.");
  }

  const userExists = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
    email,
  ]);

  if (userExists.rows.length) {
    res.status(400);
    throw new Error("Email already exists.");
  }

  // Get userAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  if (npm_nidn.length === 12) {
    const role = "Mahasiswa";
    const created_at = unixTimestamp;
    const convert = convertDate(created_at);
    // Save user to DB
    const saveUser = await DB.query(
      `INSERT INTO tb_users(npm, email, password, role, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6) returning *`,
      [npm_nidn, email, hashedPassword, role, userAgent, convert]
    );

    if (saveUser.rows.length) {
      const { user_id, npm, email } = saveUser.rows[0];

      // Create verification token
      const verificationToken =
        crypto.randomBytes(32).toString("hex") + user_id;
      console.log("verif token :", verificationToken);
      const hashedToken = hashToken(verificationToken);

      const unix = unixTimestamp;
      const createdAt = await convertDate(unix);
      const unixExpires = expires_at;
      const expiresAt = await convertDate(unixExpires);

      await DB.query(
        "INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)",
        [user_id, hashedToken, createdAt, expiresAt]
      );

      // Construct Verification Token
      const verificationUrl = `${process.env.FRONTEND_URL}/verification/${verificationToken}`;

      // Send verification email
      const subject = "Verify Your Account";
      const send_to = email;
      const send_from = process.env.EMAIL_USER;
      const template = "verifyEMail";
      const link = verificationUrl;

      await sendMail(subject, send_to, send_from, template, link);

      res.status(200).json({
        message: `Verification Email Sent ${email}.`,
      });
    } else {
      res.status(400);
      throw new Error("Invalid User data");
    }
  } else if (npm_nidn.length === 10) {
    const role = "Dosen";
    const convert = convertDate(unixTimestamp);
    // Save user to DB
    const saveUser = await DB.query(
      `INSERT INTO tb_users(nidn, email, password, role, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6) returning *`,
      [npm_nidn, email, hashedPassword, role, userAgent, convert]
    );

    if (saveUser.rows.length) {
      const { user_id, nidn, email } = saveUser.rows[0];

      // Create verification token
      const verificationToken =
        crypto.randomBytes(32).toString("hex") + user_id;
      console.log(verificationToken);
      const hashedToken = hashToken(verificationToken);

      const unix = unixTimestamp;
      const createdAt = convertDate(unix);
      const unixExpires = expires_at;
      const expiresAt = convertDate(unixExpires);

      await DB.query(
        "INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)",
        [user_id, hashedToken, createdAt, expiresAt]
      );

      // Construct Verification Token
      const verificationUrl = `${process.env.FRONTEND_URL}/verification/${verificationToken}`;

      // Send verification email
      const subject = "Verify Your Account";
      const send_to = email;
      const send_from = process.env.EMAIL_USER;
      const template = "verifyEMail";
      const link = verificationUrl;

      try {
        await sendMail(subject, send_to, send_from, template, link);
      } catch (error) {
        throw new Error("Email not send, please try again");
      }

      res.status(200).json({
        message: `Verification Email Sent ${email}.`,
      });
    } else {
      res.status(400);
      throw new Error("Invalid User data");
    }
  } else {
    res.status(400);
    throw new Error("Invalid NPM or NIDN");
  }
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Pleas add email and password.");
  }

  const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
    email,
  ]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("Invalid Email Or Password.");
  }

  const passwordIsCorrect = await bcrypt.compare(
    password,
    user.rows[0].password
  );

  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid Email Or Password.");
  }

  if (!user.rows[0].isverified) {
    // Delete token if it exists in DB
    const token = await DB.query("SELECT * FROM token WHERE user_id = $1", [
      user.rows[0].user_id,
    ]);

    if (token.rows.length) {
      await DB.query("DELETE FROM token WHERE user_id = $1", [
        user.rows[0].user_id,
      ]);
    }
    // Create verification token
    const verificationToken =
      crypto.randomBytes(32).toString("hex") + user.rows[0].user_id;
    console.log(verificationToken);
    const hashedToken = hashToken(verificationToken);

    const unix = unixTimestamp;
    const createdAt = await convertDate(unix);
    const unixExpires = expires_at;
    const expiresAt = await convertDate(unixExpires);

    await DB.query(
      "INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)",
      [user.rows[0].user_id, hashedToken, createdAt, expiresAt]
    );

    // Construct Verification Token
    const verificationUrl = `${process.env.FRONTEND_URL}/verification/${verificationToken}`;

    // Send verification email
    const subject = "Verify Your Account";
    const send_to = user.rows[0].email;
    const send_from = process.env.EMAIL_USER;
    const template = "verifyEMail";
    const link = verificationUrl;

    await sendMail(subject, send_to, send_from, template, link);

    res.status(399);
    throw new Error("Account not verified. Check your email for verification.");
  }

  // Generate token before login
  const ua = parser(req.headers["user-agent"]);
  const thisUserAgent = ua.ua;

  const allowedAgent = user.rows[0].user_agent.includes(thisUserAgent);

  if (!allowedAgent) {
    await DB.query(
      "UPDATE tb_users SET user_agent = array_append(user_agent, $1) WHERE user_id = $2",
      [thisUserAgent, user.rows[0].user_id]
    );

    const convert = convertDate(unixTimestamp);
    const text = `Your account has been logged in to the device/browser ${thisUserAgent} at ${convert.toUTCString()}`;
    // Send Notice Email
    const subject = "Notice For Your Account Smart Kampus";
    const send_to = user.rows[0].email;
    const send_from = process.env.EMAIL_USER;
    const template = "noticeAccount";
    const link = text;

    try {
      await sendMail(subject, send_to, send_from, template, link);
    } catch (error) {
      res.status(500);
      throw new Error("Email not send, Please try again.");
    }
  }
  // END

  const id = user.rows[0].user_id;
  // // Generate Token
  const token = generateToken(id);

  const findDataPribadi = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
    [id]
  );

  if (!findDataPribadi.rows.length) {
    const {
      user_id,
      npm,
      nidn,
      username,
      email,
      role,
      isverified,
      created_at,
    } = user.rows[0];
    // Send HTTP-only Cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({
      message: "Please complete the purchased personal data first.",
      data: {
        user_id,
        npm,
        nidn,
        username,
        email,
        role,
        isverified,
        created_at,
        token,
      },
    });
  } else if (user.rows.length && passwordIsCorrect) {
    const {
      user_id,
      npm,
      nidn,
      username,
      email,
      role,
      isverified,
      created_at,
    } = user.rows[0];
    // Send HTTP-only Cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    res.status(200).json({
      message: "Login Success.",
      data: {
        user_id,
        npm,
        nidn,
        username,
        email,
        role,
        isverified,
        created_at,
        token,
      },
    });
  } else {
    res.status(500);
    throw new Error("Somthing went wrong, Pleas try again.");
  }
});

exports.cekDataPribadi = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
    [id]
  );

  if (!findData.rows.length) {
    return res.json(false);
  } else {
    return res.json(true);
  }
});

exports.getLoginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.json(false);
  }

  // Verified token
  const verified = jwt.verify(token, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  }

  return res.json(false);
});

// Send login code if different user agent
exports.sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const findUser = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
    email,
  ]);

  if (!findUser.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  let userToken = await DB.query("SELECT * FROM token WHERE user_id = $1", [
    findUser.rows[0].user_id,
  ]);

  if (!userToken.rows.length) {
    res.status(400);
    throw new Error("Invalid or expired token, please login again.");
  }

  const loginCode = userToken.rows[0].login_token;
  const decryptedLoginCode = cryptr.decrypt(loginCode.toString());

  // Send login code to email
  const subject = "Login Access Code";
  const send_to = email;
  const send_from = process.env.EMAIL_USER;
  const template = "loginCode";
  const link = decryptedLoginCode;

  try {
    await sendMail(subject, send_to, send_from, template, link);

    res.status(200).json({ message: `Access code sent to ${email}` });
  } catch (error) {
    res.status(500);
    throw new Error("Email not send, Please try again.");
  }
});

exports.loginWithCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { loginCode } = req.body;

  // find user
  const findUser = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
    email,
  ]);

  if (!findUser.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // Find user login token
  const userToken = await DB.query("SELECT * FROM token WHERE user_id = $1", [
    findUser.rows[0].user_id,
  ]);

  if (!userToken.rows.length) {
    res.status(400);
    throw new Error("Invalid or expired token, Please try again.");
  }

  const decryptedLoginCode = cryptr.decrypt(userToken.rows[0].login_token);

  console.log(decryptedLoginCode);

  if (loginCode !== decryptedLoginCode) {
    res.status(400);
    throw new Error("Incorrect login code, Please try again.");
  } else {
    // Register userAgent
    const ua = parser(req.headers["user-agent"]);
    const thisuserAgent = ua.ua;

    await DB.query(
      "UPDATE tb_users SET user_agent = array_append(user_agent, $1) WHERE user_id = $2",
      [thisuserAgent, findUser.rows[0].user_id]
    );

    // Generate token
    const token = generateToken(findUser.rows[0].user_id);

    // Send HTTP-only Cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const data = await DB.query(
      "SELECT * FROM tb_data_pribadi JOIN tb_users USING(user_id) WHERE tb_data_pribadi.user_id = $1;",
      [findUser.rows[0].user_id]
    );

    const {
      user_id,
      username,
      email,
      role,
      isverified,
      nama_lengkap,
      tanggal_lahir,
      tempat_lahir,
      jenkel,
      image,
      nik,
      agama,
      warga_negara,
      alamat,
      rt,
      rw,
      desa_kelurahan,
      kota_kabupaten,
      provinsi,
      kode_pos,
      no_hp,
      created_at,
    } = data.rows[0];

    res.status(200).json({
      message: "Login Success.",
      data: {
        user_id,
        username,
        email,
        role,
        isverified,
        nama_lengkap,
        tanggal_lahir,
        tempat_lahir,
        jenkel,
        image,
        nik,
        agama,
        warga_negara,
        alamat,
        rt,
        rw,
        desa_kelurahan,
        kota_kabupaten,
        provinsi,
        kode_pos,
        no_hp,
        created_at,
      },
    });
  }
});

exports.sendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    req.user.user_id,
  ]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  if (user.rows[0].isverified) {
    res.status(400);
    throw new Error("User already verified.");
  }

  // Delete token if it exists in DB
  const token = await DB.query("SELECT * FROM token WHERE user_id = $1", [
    user.rows[0].user_id,
  ]);

  if (token.rows.length) {
    await DB.query("DELETE FROM token WHERE user_id = $1", [
      user.rows[0].user_id,
    ]);
  }

  // Create verification token
  const verificationToken =
    crypto.randomBytes(32).toString("hex") + user.rows[0].user_id;
  console.log(verificationToken);
  const hashedToken = hashToken(verificationToken);

  const unix = unixTimestamp;
  const createdAt = await convertDate(unix);
  const unixExpires = expires_at;
  const expiresAt = await convertDate(unixExpires);

  await DB.query(
    "INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)",
    [user.rows[0].user_id, hashedToken, createdAt, expiresAt]
  );

  // Construct Verification Token
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

  // Send verification email
  const subject = "Verify Your Account";
  const send_to = user.rows[0].email;
  const send_from = process.env.EMAIL_USER;
  const template = "verifyEMail";
  const link = verificationUrl;

  try {
    await sendMail(subject, send_to, send_from, template, link);
    res.status(200).json({ message: "Verification email sent." });
  } catch (error) {
    throw new Error("Email not send, please try again");
  }
});

exports.verifyUser = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const hashedToken = hashToken(verificationToken);

  const userToken = await DB.query(
    "SELECT * FROM token WHERE verif_token = $1",
    [hashedToken]
  );

  if (!userToken.rows.length) {
    res.status(404);
    throw new Error("Invalid or expired token.");
  }

  // Find User
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userToken.rows[0].user_id,
  ]);

  if (user.rows[0].isverified) {
    res.status(400);
    throw new Error("User is already verified.");
  }

  // verify user
  const verifyUser = await DB.query(
    "UPDATE tb_users SET isverified = $1 WHERE user_id = $2 returning *",
    [true, user.rows[0].user_id]
  );

  const { user_id, npm, nidn, username, email, role, isverified, created_at } =
    verifyUser.rows[0];
  // Send HTTP-only Cookie

  if (verifyUser.rows[0].isverified === true) {
    const token = generateToken(user.rows[0].user_id);
    // Send HTTP-only Cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    res.status(200).json({
      message: "Account verification successfully",
      data: {
        user_id,
        npm,
        nidn,
        username,
        email,
        role,
        isverified,
        created_at,
        token,
      },
    });
  }
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Logout successfull." });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const user = await DB.query("SELECT * FROM tb_users");
  if (user.rows.length) {
    res.status(200).json({
      message: "Success get data.",
      data: user.rows,
    });
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

exports.updateUserLogin = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  const { npm_nidn, email } = req.body;
  const oldData = user.rows[0];
  if (user.rows[0].role === "Mahasiswa") {
    if (npm_nidn.length === 12) {
      oldData.npm = npm_nidn || oldData.npm;
      oldData.email = email || oldData.email;

      const updateUser = await DB.query(
        `UPDATE tb_users SET npm = $1, email = $2 WHERE user_id = $3 returning *`,
        [oldData.npm, oldData.email, oldData.user_id]
      );

      res.status(200).json({
        message: "Success Update Data",
        data: updateUser.rows[0],
      });
    } else {
      res.status(400);
      throw new Error("Invalid NPM or NIDN.");
    }
  } else if (user.rows[0].role === "Dosen") {
    if (npm_nidn.length === 12) {
      oldData.nidn = npm_nidn || oldData.nidn;
      oldData.email = email || oldData.email;

      const updateUser = await DB.query(
        `UPDATE tb_users SET nidn = $1, email = $2 WHERE user_id = $3 returning *`,
        [oldData.nidn, oldData.email, oldData.user_id]
      );

      res.status(200).json({
        message: "Success Update Data",
        data: updateUser.rows[0],
      });
    } else {
      res.status(400);
      throw new Error("Invalid NPM or NIDN.");
    }
  } else if (user.rows[0].role === "Admin") {
    oldData.npm = npm_nidn || oldData.npm;
    oldData.nidn = npm_nidn || oldData.nidn;
    oldData.email = email || oldData.email;

    const updateUser = await DB.query(
      `UPDATE tb_users SET npm $1, nidn = $2, email = $3 WHERE user_id = $4 returning *`,
      [oldData.npm, oldData.nidn, oldData.email, oldData.user_id]
    );

    res.status(200).json({
      message: "Success Update Data",
      data: updateUser.rows[0],
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data.");
  }
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findUser = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    id,
  ]);

  if (!findUser.rows.length) {
    res.status(400);
    throw new Error("User not found.");
  }

  await DB.query("DELETE FROM tb_users WHERE user_id = $1", [id]);

  res.status(200).json({ message: "User deleted successfully." });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Pleas enter your email.");
  }

  const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
    email,
  ]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // DELETE TOKEN IF IT exists in DB
  const token = await DB.query("SELECT * FROM token WHERE user_id = $1", [
    user.rows[0].user_id,
  ]);

  if (token.rows.length) {
    await DB.query("DELETE FROM token WHERE user_id = $1", [
      user.rows[0].user_id,
    ]);
  }

  // Created reset token and save
  const resetToken =
    crypto.randomBytes(32).toString("hex") + user.rows[0].user_id;

  // Hashtoken
  const hashedToken = hashToken(resetToken);

  const now = new Date();
  const later = new Date();
  later.setTime(now.getTime() + 60 * 60 * 100); // 60 mins

  await DB.query(
    "INSERT INTO token(user_id, reset_token, created_at, expires_at) VALUES ($1, $2, $3, $4)",
    [user.rows[0].user_id, hashedToken, now, later]
  );

  // construct reset password url
  const resetPassUrl = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;

  // Send verification email
  const subject = "Password Reset Request";
  const send_to = user.rows[0].email;
  const send_from = process.env.EMAIL_USER;
  const template = "forgotPassword";
  const link = resetPassUrl;
  try {
    await sendMail(subject, send_to, send_from, template, link);

    res.status(200).json({ message: "Password Reset Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not send, please try again.");
  }
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { error } = resetPasswordValidation(req.body);

  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { resetToken } = req.params;
  const { password } = req.body;

  const hashedToken = hashToken(resetToken);

  const userToken = await DB.query(
    "SELECT * FROM token WHERE reset_token = $1",
    [hashedToken]
  );

  if (!userToken.rows.length) {
    res.status(404);
    throw new Error("Invalid or expires token.");
  }

  // find user
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userToken.rows[0].user_id,
  ]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Now reset password
  await DB.query("UPDATE tb_users SET password = $1 WHERE user_id = $2", [
    hashedPassword,
    user.rows[0].user_id,
  ]);

  res
    .status(200)
    .json({ message: "Password reset successfull, please login." });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { error } = changePasswordValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { oldPassword, password } = req.body;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    req.user.user_id,
  ]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Check if old password is correct
  const passwordIsCorrect = await bcrypt.compare(
    oldPassword,
    user.rows[0].password
  );

  if (passwordIsCorrect === false) {
    res.status(400);
    throw new Error("Old password is incorrect.");
  }

  if (user.rows.length && passwordIsCorrect) {
    // Now change password
    await DB.query("UPDATE tb_users SET password = $1 WHERE user_id = $2", [
      hashedPassword,
      user.rows[0].user_id,
    ]);

    res.clearCookie("token", "", {
      path: "/",
      httpOnly: true,
      expires: new Date(0),
      sameSite: "none",
      secure: true,
    });
    return res
      .status(200)
      .json({ message: "Password change successfull, please re-login" });

    // res
    //   .status(200)
    //   .json({ message: "Password change successfull, please re-login" });
  }
});

exports.sendAutomatedEmail = asyncHandler(async (req, res) => {
  const { subject, send_to, template, url } = req.body;

  if (!subject || !send_to || !template) {
    res.status(400);
    throw new Error("Missing email parameter.");
  }

  // Get user
  const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
    send_to,
  ]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  const send_from = process.env.EMAIL_USER;
  const link = `${process.env.FRONTEND_URL}${url}`;

  try {
    await sendEmail(subject, send_to, send_from, template, link);

    res.status(200).json({ message: "Email Sent!" });
  } catch (error) {
    throw new Error("Email not send, please try again.");
  }
});

exports.deleteExpired = asyncHandler(async (req, res) => {
  const now = new Date();
  await DB.query("DELETE FROM token WHERE expires_at <= $1", [now]);
  res.status(200).send({ message: "Oke" });
});
