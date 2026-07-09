const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { formRegisterValidation, resetPasswordValidation, changePasswordValidation, formRegisterPmmValidation, formRegisterDosenExt, formRegisterKaryawanValidation } = require("../../validation/formValidation");
const bcrypt = require("bcryptjs");
const parser = require("ua-parser-js");
const { generateToken, hashToken, unixTimestamp, convertDate, expires_at } = require("../../utils");
const sendMail = require("../../utils/sendMail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
// Triger 2FA
const Cryptr = require("cryptr");
const sendEmail = require("../../utils/sendMail");
const { getInformaticsStudent, getDosen, getPmmStudent, getPegawai } = require("../../helper/informatics");
const { getIp, deleteIp } = require("../../helper/ipk");
const { updateGamifyKompetensi } = require("../../utils/gamifyKompetensi");
const cryptr = new Cryptr(process.env.CRYPTR_KEY);

const { default: axios } = require("axios");
const TrxUserJabatanUnit = require("../../models/TrxUserJabatanUnit");
const Jabatan = require("../../models/master/Jabatan");
const Unit = require("../../models/master/Unit");

exports.register = asyncHandler(async (req, res) => {
  const { error } = formRegisterValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { npm_nidn, email, password } = req.body;

  const checkIfExists = async (column, value, errorMessage) => {
    const result = await DB.query(`SELECT * FROM tb_users WHERE ${column} = $1`, [value]);

    if (result.rows.length) {
      res.status(400);
      throw new Error(errorMessage);
    }
  };

  await checkIfExists("npm", npm_nidn, "NPM already exists.");
  await checkIfExists("nidn", npm_nidn, "NIDN already exists.");
  await checkIfExists("email", email, "Email already exists.");

  if (!npm_nidn || !email || !password) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  // Get userAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  if (npm_nidn.length === 12 || npm_nidn.length === 11) {
    const role = process.env.ROLE_ID_MAHASISWA;
    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const results = await getInformaticsStudent();
    const studentWithNpm = results.find((student) => student.code === npm_nidn);

    if (studentWithNpm) {
      // Save user to DB
      const saveUser = await DB.query(`INSERT INTO tb_users(npm, email, password, role, user_agent, created_at, curr_code, department_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) returning *`, [
        npm_nidn,
        email,
        hashedPassword,
        role,
        userAgent,
        convert,
        studentWithNpm.curr_code,
        studentWithNpm.department_code,
      ]);


      const jenkelSiak =
        studentWithNpm.sex === "LAKI-LAKI"
          ? "L"
          : studentWithNpm.sex === "PEREMPUAN"
            ? "P"
            : null;


      const savePersonalData = await DB.query(
        `INSERT INTO tb_data_pribadi(user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, ibu_kandung, agama, email, alamat, kota_kabupaten, no_hp, nik, created_at, kode_mhs) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING *`,
        [
          saveUser.rows[0].user_id,
          studentWithNpm.name,
          jenkelSiak,
          studentWithNpm.birthdate,
          studentWithNpm.birthplace,
          studentWithNpm.mothers_maiden_name,
          studentWithNpm.religion,
          email,
          studentWithNpm.address,
          studentWithNpm.city,
          studentWithNpm.mobile_phone,
          studentWithNpm.national_id_number,
          convert,
          studentWithNpm.status,
        ],
      );

      const reqInsertedIp = await getIp(saveUser.rows[0].user_id, npm_nidn);

      if (reqInsertedIp != 200) {
        res.status(400);
        throw new Error("failed to delete and add ip data.");
      }

      const achievementsData = await DB.query("SELECT id FROM achievements");
      const achievementsDefault = achievementsData.rows.map((row) => row.id);

      const userAchievementsInserts = [];
      for (const achievementId of achievementsDefault) {
        const userAchievementInsert = await DB.query("INSERT INTO user_achievements(user_id, achievement_id, status) VALUES ($1, $2, $3) RETURNING *", [saveUser.rows[0].user_id, achievementId, 0]);
        userAchievementsInserts.push(userAchievementInsert);
      }

      const allUserAchievementsInserted = userAchievementsInserts.every((result) => result.rows.length > 0);

      if (saveUser.rows.length && savePersonalData.rows.length && allUserAchievementsInserted) {
        const { user_id, npm, email } = saveUser.rows[0];

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString("hex") + user_id;
        // console.log("verif token :", verificationToken);
        const hashedToken = hashToken(verificationToken);

        const unix = unixTimestamp;
        const createdAt = await convertDate(unix);
        const unixExpires = expires_at;
        const expiresAt = await convertDate(unixExpires);

        await DB.query("INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [user_id, hashedToken, createdAt, expiresAt]);

        // Construct Verification Token
        const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;

        // Send verification email
        const subject = "Verify Your Account";
        const send_to = email;
        const send_from = process.env.EMAIL_USER;
        const template = "verifyEmail";
        const link = verificationUrl;

        await sendMail(subject, send_to, send_from, template, link);

        res.status(200).json({
          message: `Verification Email Sent ${email}.`,
          data: saveUser.rows[0],
        });
      } else {
        res.status(400);
        throw new Error("Invalid User data");
      }
    } else {
      res.status(400);
      throw new Error("INVALID NPM. NPM NOT FOUND!!");
    }
  } else if (npm_nidn.length === 10 || npm_nidn.length === 9 || npm_nidn.length === 8) {
    const role = process.env.ROLE_ID_DOSEN;
    const convert = convertDate(unixTimestamp);

    const resultsDosen = await getDosen();
    const dosenWithNidn = resultsDosen.find((dosen) => dosen.nidn === npm_nidn || dosen.nip === npm_nidn);

    if (dosenWithNidn) {
      // Save user to DB
      const saveUser = await DB.query(`INSERT INTO tb_users(nidn, email, password, role, user_agent, created_at, department_code) VALUES ($1, $2, $3, $4, $5, $6, $7) returning *`, [
        npm_nidn,
        email,
        hashedPassword,
        role,
        userAgent,
        convert,
        dosenWithNidn.lookup_id,
      ]);

      const jenkelSiak =
        dosenWithNidn.jenis_kelamin === "LAKI-LAKI"
          ? "L"
          : dosenWithNidn.jenis_kelamin === "PEREMPUAN"
            ? "P"
            : null;

      const statusKawin = dosenWithNidn.status_sipil !== "MENIKAH" ? 0 : 1;

      const savePersonalData = await DB.query(
        `INSERT INTO tb_data_pribadi(user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, ibu_kandung, agama, email, alamat, kota_kabupaten, no_hp, provinsi, kode_pos, status_kawin, nik, created_at, kode_mhs, nip) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
        RETURNING *`,
        [
          saveUser.rows[0].user_id,
          `${dosenWithNidn.gelar_depan} ${dosenWithNidn.nama} ${dosenWithNidn.gelar_belakang}`,
          jenkelSiak,
          dosenWithNidn.tanggal_lahir,
          dosenWithNidn.tempat_lahir,
          dosenWithNidn.nama_ibu_kandung,
          dosenWithNidn.agama,
          email,
          dosenWithNidn.alamat,
          dosenWithNidn.kota,
          dosenWithNidn.no_handphone,
          dosenWithNidn.propinsi,
          dosenWithNidn.kodepos,
          statusKawin,
          dosenWithNidn.no_ktp,
          convert,
          dosenWithNidn.klasi_pegawai,
          dosenWithNidn?.nip,
        ],
      );

      if (saveUser.rows.length && savePersonalData.rows.length) {
        const { user_id, nidn, email } = saveUser.rows[0];

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString("hex") + user_id;
        // console.log(verificationToken);
        const hashedToken = hashToken(verificationToken);

        const unix = unixTimestamp;
        const createdAt = convertDate(unix);
        const unixExpires = expires_at;
        const expiresAt = convertDate(unixExpires);

        await DB.query("INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [user_id, hashedToken, createdAt, expiresAt]);

        // Construct Verification Token
        const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;

        // Send verification email
        const subject = "Verify Your Account";
        const send_to = email;
        const send_from = process.env.EMAIL_USER;
        const template = "verifyEmail";
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
      throw new Error("INVALID NIDN. NIDN NOT FOUND!!");
    }
  } else {
    res.status(400);
    throw new Error("Invalid NPM or NIDN");
  }
});

exports.registerMhsPmm = asyncHandler(async (req, res) => {
  const { error } = formRegisterPmmValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { npm, email, password } = req.body;

  const checkIfExists = async (column, value, errorMessage) => {
    const result = await DB.query(`SELECT * FROM tb_users WHERE ${column} = $1`, [value]);

    if (result.rows.length) {
      res.status(400);
      throw new Error(errorMessage);
    }
  };

  await checkIfExists("npm", npm, "NPM already exists.");
  await checkIfExists("email", email, "Email already exists.");

  if (!npm || !email || !password) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  // Get userAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const role = process.env.ROLE_ID_MAHASISWA;
  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const result = await getPmmStudent(npm);
  const dataMhsPmm = result[0];

  if (result.length) {
    // Save user to DB
    const saveUser = await DB.query(`INSERT INTO tb_users(npm, email, password, role, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6) returning *`, [npm, email, hashedPassword, role, userAgent, convert]);


    const jenkelSiak =
      dataMhsPmm.sex === "LAKI-LAKI"
        ? "L"
        : dataMhsPmm.sex === "PEREMPUAN"
          ? "P"
          : null;


    const savePersonalData = await DB.query(
      `INSERT INTO tb_data_pribadi(user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, agama, email,  no_hp, nik, created_at, kode_mhs) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
      [saveUser.rows[0].user_id, dataMhsPmm.name, jenkelSiak, dataMhsPmm.birthdate, dataMhsPmm.birthplace, dataMhsPmm.religion, email, dataMhsPmm.phone, dataMhsPmm.national_id_number, convert, "PMM"],
    );

    if (saveUser.rows.length && savePersonalData.rows.length) {
      const { user_id, npm, email } = saveUser.rows[0];

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString("hex") + user_id;
      // console.log("verif token :", verificationToken);
      const hashedToken = hashToken(verificationToken);

      const unix = unixTimestamp;
      const createdAt = await convertDate(unix);
      const unixExpires = expires_at;
      const expiresAt = await convertDate(unixExpires);

      await DB.query("INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [user_id, hashedToken, createdAt, expiresAt]);

      // Construct Verification Token
      const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;

      // Send verification email
      const subject = "Verify Your Account";
      const send_to = email;
      const send_from = process.env.EMAIL_USER;
      const template = "verifyEmail";
      const link = verificationUrl;

      await sendMail(subject, send_to, send_from, template, link);

      res.status(200).json({
        message: `Verification Email Sent ${email}.`,
      });
    } else {
      res.status(400);
      throw new Error("Invalid User data");
    }
  } else {
    res.status(400);
    throw new Error("INVALID NPM. NPM NOT FOUND!!");
  }
});

exports.registerDosenExt = asyncHandler(async (req, res) => {
  const { error } = formRegisterDosenExt(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { nip, email, password, tanggal_lahir, tempat_lahir, nama_lengkap, jenkel, agama, no_hp, instansi } = req.body;

  if (!nip || !email || !password) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const findEmail = await DB.query(`SELECT * FROM tb_users WHERE email = $1`, [email]);
  if (findEmail.rows.length) {
    res.status(400);
    throw new Error("Email already exixts");
  }

  const findNip = await DB.query("SELECT * FROM tb_data_pribadi WHERE nip = $1", [nip]);
  if (findNip.rows.length) {
    res.status(400);
    throw new Error("NIP/NIK already exixts");
  }

  // Get userAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const role = process.env.ROLE_ID_DOSEN_EXT;
  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  // Save user to DB
  const saveUser = await DB.query(`INSERT INTO tb_users(email, password, role, user_agent, created_at) VALUES ($1, $2, $3, $4, $5) returning *`, [email, hashedPassword, role, userAgent, convert]);

  const savePersonalData = await DB.query(
    `INSERT INTO tb_data_pribadi(user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, agama, email,  no_hp, nip, created_at, instansi_ext) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
    [saveUser.rows[0].user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, agama, email, no_hp, nip, convert, instansi],
  );

  if (saveUser.rows.length && savePersonalData.rows.length) {
    res.status(200).json({
      message: `Register successfully`,
    });
  } else {
    res.status(400);
    throw new Error("Invalid User data");
  }
});

exports.registerPegawai = asyncHandler(async (req, res) => {
  const { error } = formRegisterKaryawanValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { nip, email, password } = req.body;

  const checkEmail = await DB.query(`SELECT * FROM tb_users WHERE email = $1`, [email]);
  if (checkEmail.rows.length) {
    res.status(400);
    throw new Error("Email already exists.");
  }

  const checkNip = await DB.query(`SELECT * FROM tb_data_pribadi WHERE nip = $1`, [nip]);
  if (checkNip.rows.length) {
    res.status(400);
    throw new Error("NIP already exists.");
  }

  if (!nip || !email || !password) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  // Get userAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const role = process.env.ROLE_ID_PEGAWAI;
  const convert = convertDate(unixTimestamp);

  const resultPegawai = await getPegawai();
  const pegawaiWithNip = resultPegawai.find((pegawai) => pegawai.nip === nip);

  if (pegawaiWithNip) {
    // Save user to DB
    const saveUser = await DB.query(`INSERT INTO tb_users(email, password, role, user_agent, created_at, department_code) VALUES ($1, $2, $3, $4, $5, $6) returning *`, [
      email,
      hashedPassword,
      role,
      userAgent,
      convert,
      pegawaiWithNip.branch,
    ]);


    const jenkelSiak =
      pegawaiWithNip.jenis_kelamin === "LAKI-LAKI"
        ? "L"
        : pegawaiWithNip.jenis_kelamin === "PEREMPUAN"
          ? "P"
          : null;

    const statusKawin = pegawaiWithNip.status_sipil !== "MENIKAH" ? 0 : 1;

    const savePersonalData = await DB.query(
      `INSERT INTO tb_data_pribadi(user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, ibu_kandung, agama, email, alamat, kota_kabupaten, no_hp, provinsi, kode_pos, status_kawin, nik, created_at, kode_mhs, nip) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
        RETURNING *`,
      [
        saveUser.rows[0].user_id,
        `${pegawaiWithNip.gelar_depan} ${pegawaiWithNip.nama} ${pegawaiWithNip.gelar_belakang}`,
        jenkelSiak,
        pegawaiWithNip.tanggal_lahir,
        pegawaiWithNip.tempat_lahir,
        pegawaiWithNip.nama_ibu_kandung,
        pegawaiWithNip.agama,
        email,
        pegawaiWithNip.alamat,
        pegawaiWithNip.kota,
        pegawaiWithNip.no_handphone,
        pegawaiWithNip.propinsi,
        pegawaiWithNip.kodepos,
        statusKawin,
        pegawaiWithNip.no_ktp,
        convert,
        pegawaiWithNip.klasi_pegawai,
        pegawaiWithNip?.nip,
      ],
    );

    if (saveUser.rows.length && savePersonalData.rows.length) {
      const { user_id, nidn, email } = saveUser.rows[0];

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString("hex") + user_id;
      // console.log(verificationToken);
      const hashedToken = hashToken(verificationToken);

      const unix = unixTimestamp;
      const createdAt = convertDate(unix);
      const unixExpires = expires_at;
      const expiresAt = convertDate(unixExpires);

      await DB.query("INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [user_id, hashedToken, createdAt, expiresAt]);

      // Construct Verification Token
      const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;

      // Send verification email
      const subject = "Verify Your Account";
      const send_to = email;
      const send_from = process.env.EMAIL_USER;
      const template = "verifyEmail";
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
    throw new Error("INVALID NIP. NIP NOT FOUND!!");
  }
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Pleas add email and password.");
  }

  const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [email]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("Invalid Email Or Password.");
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.rows[0].password);

  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid Email Or Password.");
  }

  if (!user.rows[0].isverified) {
    if (user.rows[0].role == "Mahasiswa" || user.rows[0].role == "Dosen") {
      // Delete token if it exists in DB
      const token = await DB.query("SELECT * FROM token WHERE user_id = $1", [user.rows[0].user_id]);

      if (token.rows.length) {
        await DB.query("DELETE FROM token WHERE user_id = $1", [user.rows[0].user_id]);
      }
      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString("hex") + user.rows[0].user_id;
      // console.log(verificationToken);
      const hashedToken = hashToken(verificationToken);

      const unix = unixTimestamp;
      const createdAt = await convertDate(unix);
      const unixExpires = expires_at;
      const expiresAt = await convertDate(unixExpires);

      await DB.query("INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [user.rows[0].user_id, hashedToken, createdAt, expiresAt]);

      // Construct Verification Token
      const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;

      // Send verification email
      const subject = "Verify Your Account";
      const send_to = user.rows[0].email;
      const send_from = process.env.EMAIL_USER;
      const template = "verifyEmail";
      const link = verificationUrl;

      await sendMail(subject, send_to, send_from, template, link);

      res.status(399);
      throw new Error("Account not verified. Check your email for verification.");
    } else if (user.rows[0].role == "Dosen_Ext") {
      res.status(399);
      throw new Error("Account not verified. verification is being processed");
    }
  }

  // Generate token before login
  const ua = parser(req.headers["user-agent"]);
  const thisUserAgent = ua.ua;

  const allowedAgent = user.rows[0].user_agent?.includes(thisUserAgent) || false;

  if (!allowedAgent) {
    await DB.query("UPDATE tb_users SET user_agent = array_append(user_agent, $1) WHERE user_id = $2", [thisUserAgent, user.rows[0].user_id]);

    const convert = convertDate(unixTimestamp);
    const text = `Your account has been logged in to the device/browser ${thisUserAgent} at ${convert.toUTCString()}`;
    // Send Notice Email
    const subject = "Notice For Your Account TIAS";
    const send_to = user.rows[0].email;
    const send_from = process.env.EMAIL_USER;
    const template = "noticeAccount";
    const link = text;

    try {
      await sendMail(subject, send_to, send_from, template, link);
    } catch (error) {
      // Email notice gagal tidak memblokir login
      console.warn("[LOGIN] Gagal kirim email notifikasi perangkat baru:", error.message);
    }
  }
  // END

  const id = user.rows[0].user_id;
  // // Generate Token
  const token = generateToken(id);

  if (user.rows.length && passwordIsCorrect) {
    const { user_id, npm, nidn, username, email, role, isverified, created_at } = user.rows[0];

    const unix = unixTimestamp;
    const createdAt = await convertDate(unix);
    const unixExpires = expires_at;
    const expiresAt = await convertDate(unixExpires);

    await DB.query("INSERT INTO token(user_id, login_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [id, token, createdAt, expiresAt]);

    const getPersonalData = await DB.query("SELECT * FROM tb_data_pribadi WHERE user_id = $1", [user_id]);

const queryLencana = await DB.query(`SELECT * FROM achievements WHERE gamify = $1`, [getPersonalData.rows[0]?.rank || ""]);

    const jabatanStruktural = await TrxUserJabatanUnit.findAll({
      where: {
        user_id: user_id,
      },
      attributes: ["user_id", "jabatan_id", "unit_id"],
      include: [
        {
          model: Jabatan,
          as: "jabatan",
        },
        {
          model: Unit,
          as: "unit",
        },
      ],
    });

    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + oneMonth),
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
        nip: getPersonalData.rows[0]?.nip || "",
        nama_lengkap: getPersonalData.rows[0]?.nama_lengkap || "",
        image: getPersonalData.rows[0]?.image || "",
        no_hp: getPersonalData.rows[0]?.no_hp || "",
        imageUrl: `${process.env.API_URL}/foto-profile/${getPersonalData.rows[0]?.image}` || "",
        kode_mhs: getPersonalData.rows[0]?.kode_mhs || "",
        isverified,
        created_at,
        personalData: getPersonalData.rows[0],
        jabatanStruktural,
        lencana:
          queryLencana.rows.length &&
          queryLencana.rows.map((iterate) => ({
            lencana: `${process.env.API_URL}/gamify/lencana/${iterate.lencana}`,
          })),
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

  const findData = await DB.query("SELECT * FROM tb_data_pribadi WHERE user_id = $1", [id]);

  if (!findData.rows.length) {
    return res.json(false);
  } else {
    return res.json(true);
  }
});

exports.getLoginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  const token2 = req.params.token;

  if (!token || !token2) {
    return res.json(false);
  }

  // Verified tokend
  const verified = jwt.verify(token ? token : token2, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  }

  return res.json(false);
});

// Send login code if different user agent
exports.sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const findUser = await DB.query("SELECT * FROM tb_users WHERE email = $1", [email]);

  if (!findUser.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  let userToken = await DB.query("SELECT * FROM token WHERE user_id = $1", [findUser.rows[0].user_id]);

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
  const findUser = await DB.query("SELECT * FROM tb_users WHERE email = $1", [email]);

  if (!findUser.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // Find user login token
  const userToken = await DB.query("SELECT * FROM token WHERE user_id = $1", [findUser.rows[0].user_id]);

  if (!userToken.rows.length) {
    res.status(400);
    throw new Error("Invalid or expired token, Please try again.");
  }

  const decryptedLoginCode = cryptr.decrypt(userToken.rows[0].login_token);

  // console.log(decryptedLoginCode);

  if (loginCode !== decryptedLoginCode) {
    res.status(400);
    throw new Error("Incorrect login code, Please try again.");
  } else {
    // Register userAgent
    const ua = parser(req.headers["user-agent"]);
    const thisuserAgent = ua.ua;

    await DB.query("UPDATE tb_users SET user_agent = array_append(user_agent, $1) WHERE user_id = $2", [thisuserAgent, findUser.rows[0].user_id]);

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

    const data = await DB.query("SELECT * FROM tb_data_pribadi JOIN tb_users USING(user_id) WHERE tb_data_pribadi.user_id = $1;", [findUser.rows[0].user_id]);

    const { user_id, username, email, role, isverified, nama_lengkap, tanggal_lahir, tempat_lahir, jenkel, image, nik, agama, warga_negara, alamat, rt, rw, desa_kelurahan, kota_kabupaten, provinsi, kode_pos, no_hp, created_at } =
      data.rows[0];

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
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [req.user.user_id]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  if (user.rows[0].isverified) {
    res.status(400);
    throw new Error("User already verified.");
  }

  // Delete token if it exists in DB
  const token = await DB.query("SELECT * FROM token WHERE user_id = $1", [user.rows[0].user_id]);

  if (token.rows.length) {
    await DB.query("DELETE FROM token WHERE user_id = $1", [user.rows[0].user_id]);
  }

  // Create verification token
  const verificationToken = crypto.randomBytes(32).toString("hex") + user.rows[0].user_id;
  // console.log(verificationToken);
  const hashedToken = hashToken(verificationToken);

  const unix = unixTimestamp;
  const createdAt = await convertDate(unix);
  const unixExpires = expires_at;
  const expiresAt = await convertDate(unixExpires);

  await DB.query("INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [user.rows[0].user_id, hashedToken, createdAt, expiresAt]);

  // Construct Verification Token
  const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;

  // Send verification email
  const subject = "Verify Your Account";
  const send_to = user.rows[0].email;
  const send_from = process.env.EMAIL_USER;
  const template = "verifyEmail";
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

  const userToken = await DB.query("SELECT * FROM token WHERE verif_token = $1", [hashedToken]);

  if (!userToken.rows.length) {
    res.status(404);
    throw new Error("Invalid or expired token.");
  }

  // Check if it's a valid UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userToken.rows[0].user_id);

  let user = { rows: [] };
  if (isUUID) {
    // Find User
    user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      userToken.rows[0].user_id,
    ]);
  }

  if (!user.rows.length) {
    // Check if it's a parent user
    const parent = await DB.query("SELECT * FROM tb_parents WHERE id = $1", [
      userToken.rows[0].user_id,
    ]);

    if (!parent.rows.length) {
      res.status(404);
      throw new Error("User not found.");
    }

    if (parent.rows[0].is_verified) {
      res.status(400);
      throw new Error("User is already verified.");
    }

    // verify parent
    const verifyParent = await DB.query(
      "UPDATE tb_parents SET is_verified = $1 WHERE id = $2 returning *",
      [true, parent.rows[0].id]
    );

    if (verifyParent.rows[0].is_verified === true) {
      if (req.method === 'GET') {
        const successHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifikasi Berhasil</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%; }
                .icon { color: #15613F; font-size: 64px; margin-bottom: 20px; }
                h1 { color: #1F2937; margin-top: 0; font-size: 24px; }
                p { color: #4B5563; line-height: 1.5; margin-bottom: 30px; }
                .btn { background-color: #15613F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; transition: background 0.3s; }
                .btn:hover { background-color: #0F462D; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✓</div>
                <h1>Verifikasi Berhasil!</h1>
                <p>Akun Orang Tua Anda telah berhasil diverifikasi. Anda sekarang dapat masuk ke aplikasi UCL menggunakan akun Anda.</p>
            </div>
        </body>
        </html>
        `;
        return res.status(200).send(successHtml);
      }

      return res.status(200).json({
        message: "Account verification successfully",
        data: verifyParent.rows[0],
      });
    }
  }
  

  if (user.rows[0].isverified) {
    res.status(400);
    throw new Error("User is already verified.");
  }

  // verify user
  const verifyUser = await DB.query("UPDATE tb_users SET isverified = $1 WHERE user_id = $2 returning *", [true, user.rows[0].user_id]);

  const { user_id, npm, nidn, username, email, role, isverified, created_at } = verifyUser.rows[0];

  if (verifyUser.rows[0].isverified === true) {
    if (req.method === 'GET') {
      const successHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verifikasi Berhasil</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%; }
              .icon { color: #15613F; font-size: 64px; margin-bottom: 20px; }
              h1 { color: #1F2937; margin-top: 0; font-size: 24px; }
              p { color: #4B5563; line-height: 1.5; margin-bottom: 30px; }
              .btn { background-color: #15613F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; transition: background 0.3s; }
              .btn:hover { background-color: #0F462D; }
          </style>
      </head>
      <body>
          <div class="card">
              <div class="icon">✓</div>
              <h1>Verifikasi Berhasil!</h1>
              <p>Akun Anda telah berhasil diverifikasi. Anda sekarang dapat masuk ke aplikasi TIAS menggunakan akun Anda.</p>
              <a href="${process.env.FRONTEND_REDIRECT_URL}/login" class="btn">Kembali ke Login</a>
          </div>
      </body>
      </html>
      `;
      return res.status(200).send(successHtml);
    }

    return res.status(200).json({
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
      },
    });
  }
});

exports.verifyDosenExt = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [userId]);

  if (user.rows[0].isverified) {
    const verifyUser = await DB.query("UPDATE tb_users SET isverified = $1 WHERE user_id = $2 returning *", [true, user.rows[0].user_id]);
    const { user_id, npm, nidn, username, email, role, isverified, created_at } = verifyUser.rows[0];

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
      },
    });
  } else {
    const verifyUser = await DB.query("UPDATE tb_users SET isverified = $1 WHERE user_id = $2 returning *", [true, user.rows[0].user_id]);
    const { user_id, npm, nidn, username, email, role, isverified, created_at } = verifyUser.rows[0];

    res.status(200).json({
      message: "Account not verification successfully",
      data: {
        user_id,
        npm,
        nidn,
        username,
        email,
        role,
        isverified,
        created_at,
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

exports.getUserLogin = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [userLoginId]);

  if (user.rows.length) {
    res.status(200).json({
      message: "Success get data.",
      data: user.rows[0],
    });
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

exports.updateUserLogin = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [userLoginId]);

  const { npm, nidn, email } = req.body;

  const oldData = user.rows[0];
  if (user.rows[0].role === "Mahasiswa") {
    if (npm !== null) {
      oldData.npm = npm || oldData.npm;
      oldData.email = email || oldData.email;

      const updateUser = await DB.query(`UPDATE tb_users SET npm = $1, email = $2 WHERE user_id = $3 returning *`, [oldData.npm, oldData.email, oldData.user_id]);

      res.status(200).json({
        message: "Success Update Data",
        data: updateUser.rows[0],
      });
    } else {
      res.status(400);
      throw new Error("Invalid NPM or NIDN.");
    }
  } else if (user.rows[0].role === "Dosen") {
    if (nidn !== null) {
      oldData.nidn = nidn || oldData.nidn;
      oldData.email = email || oldData.email;

      const updateUser = await DB.query(`UPDATE tb_users SET nidn = $1, email = $2 WHERE user_id = $3 returning *`, [oldData.nidn, oldData.email, oldData.user_id]);

      res.status(200).json({
        message: "Success Update Data",
        data: updateUser.rows[0],
      });
    } else {
      res.status(400);
      throw new Error("Invalid NPM or NIDN.");
    }
  } else if (user.rows[0].role === "Admin") {
    oldData.npm = npm || oldData.npm;
    oldData.nidn = nidn || oldData.nidn;
    oldData.email = email || oldData.email;

    const updateUser = await DB.query(`UPDATE tb_users SET npm $1, nidn = $2, email = $3 WHERE user_id = $4 returning *`, [oldData.npm, oldData.nidn, oldData.email, oldData.user_id]);

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

  const findUser = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [id]);

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

  const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [email]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // DELETE TOKEN IF IT exists in DB
  const token = await DB.query("SELECT * FROM token WHERE user_id = $1", [user.rows[0].user_id]);

  if (token.rows.length) {
    await DB.query("DELETE FROM token WHERE user_id = $1", [user.rows[0].user_id]);
  }

  // Created reset token and save
  const resetToken = crypto.randomBytes(32).toString("hex") + user.rows[0].user_id;

  // Hashtoken
  const hashedToken = hashToken(resetToken);

  const now = new Date();
  const later = new Date();
  later.setTime(now.getTime() + 60 * 60 * 100); // 60 mins

  await DB.query("INSERT INTO token(user_id, reset_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [user.rows[0].user_id, hashedToken, now, later]);

  // construct reset password url
  const resetPassUrl = `${process.env.FRONTEND_REDIRECT_URL}/resetPassword/${resetToken}`;

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

  const userToken = await DB.query("SELECT * FROM token WHERE reset_token = $1", [hashedToken]);

  if (!userToken.rows.length) {
    res.status(404);
    throw new Error("Invalid or expires token.");
  }

  // find user
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [userToken.rows[0].user_id]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Now reset password
  await DB.query("UPDATE tb_users SET password = $1 WHERE user_id = $2", [hashedPassword, user.rows[0].user_id]);

  res.status(200).json({ message: "Password reset successfull, please login." });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { error } = changePasswordValidation(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const { oldPassword, password } = req.body;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [req.user.user_id]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Check if old password is correct
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.rows[0].password);

  if (passwordIsCorrect === false) {
    res.status(400);
    throw new Error("Old password is incorrect.");
  }

  if (user.rows.length && passwordIsCorrect) {
    // Now change password
    await DB.query("UPDATE tb_users SET password = $1 WHERE user_id = $2", [hashedPassword, user.rows[0].user_id]);

    res.clearCookie("token", "", {
      path: "/",
      httpOnly: true,
      expires: new Date(0),
      sameSite: "none",
      secure: true,
    });
    return res.status(200).json({ message: "Password change successfull, please re-login" });

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
  const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [send_to]);

  if (!user.rows.length) {
    res.status(404);
    throw new Error("User not found.");
  }

  const send_from = process.env.EMAIL_USER;
  const link = `${process.env.FRONTEND_REDIRECT_URL}${url}`;

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

exports.eportalGoogle = asyncHandler(async (req, res) => {
  const { email, token_google } = req.body;
  const API_URL = `https://www.googleapis.com/oauth2/v1/tokeninfo?alt=json&access_token=${token_google}`;
  const responseG = await axios
    .get(API_URL)
    .then(function (resGoogle) {
      return resGoogle["data"];
    })
    .catch(function (error) {
      res.status(404);
      throw new Error("Invalid Token Goolge.");
    });

  // return res.status(200).json({
  //   message: "Login Success.",
  //   data: {
  //     data: responseG
  //   }
  // });

  if (responseG) {
    const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [email]);

    if (!user.rows.length) {
      res.status(404);
      throw new Error("Invalid Email.");
    }
    if (!user.rows[0].isverified) {
      res.status(404);
      throw new Error("Please Verified your email");
    }

    const id = user.rows[0].user_id;
    // // Generate Token
    const token = generateToken(id);
    if (user.rows.length && user.rows[0].isverified) {
      const { user_id, npm, nidn, username, email, role, isverified, created_at } = user.rows[0];

      const unix = unixTimestamp;
      const createdAt = await convertDate(unix);
      const unixExpires = expires_at;
      const expiresAt = await convertDate(unixExpires);

      await DB.query("INSERT INTO token(user_id, login_token, created_at, expires_at) VALUES ($1, $2, $3, $4)", [id, token, createdAt, expiresAt]);

      const getPersonalData = await DB.query("SELECT * FROM tb_data_pribadi WHERE user_id = $1", [user_id]);

const queryLencana = await DB.query(`SELECT * FROM achievements WHERE gamify = $1`, [getPersonalData.rows[0]?.rank || ""]);
      const oneMonth = 30 * 24 * 60 * 60 * 1000;

      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + oneMonth),
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
          nip: getPersonalData.rows[0]?.nip || "",
          nama_lengkap: getPersonalData.rows[0]?.nama_lengkap || "",
          image: getPersonalData.rows[0]?.image || "",
          no_hp: getPersonalData.rows[0]?.no_hp || "",
          imageUrl: `${process.env.API_URL}/foto-profile/${getPersonalData.rows[0]?.image}` || "",
          kode_mhs: getPersonalData.rows[0]?.kode_mhs || "",
          isverified,
          created_at,
          personalData: getPersonalData.rows[0],
          lencana:
            queryLencana.rows.length &&
            queryLencana.rows.map((iterate) => ({
              lencana: `${process.env.API_URL}/gamify/lencana/${iterate.lencana}`,
            })),
          token,
        },
      });
    } else {
      res.status(500);
      throw new Error("Somthing went wrong, Pleas try again.");
    }
  } else {
    res.status(404);
    throw new Error("Invalid Token Goolge.");
  }
});

exports.verifyByAdmin = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const { verified } = req.body;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [user_id]);

  await DB.query("UPDATE tb_users SET isverified = $1 WHERE user_id = $2 returning *", [verified, user.rows[0].user_id]);

  res.status(200).json({
    message: "success",
    data: {
      user_id,
      npm,
      nidn,
      username,
      email,
      role,
      isverified,
      created_at,
    },
  });
});
