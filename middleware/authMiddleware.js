const asyncHandler = require("express-async-handler");
const DB = require("../database");
const jwt = require("jsonwebtoken");
const { GamifyPoints } = require("../utils/gamify");
const Parents = require("../models/Parents");
const User = require("../models/User");
const TrxUserJabatanUnit = require("../models/TrxUserJabatanUnit");
const DataPribadi = require("../models/DataPribadi");
const Jabatan = require("../models/master/Jabatan");
const Unit = require("../models/master/Unit");

exports.protected = asyncHandler(async (req, res, next) => {
  try {
    const { token } = req.headers;

    if (!token) {
      res.status(401);
      throw new Error("Not Authorized, Please login.");
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    const user = await DB.query(
      `SELECT tb_users.*, tb_data_pribadi.* 
       FROM tb_users 
       JOIN tb_data_pribadi ON tb_data_pribadi.user_id = tb_users.user_id 
       WHERE tb_users.user_id = $1`,
      [verified.id]
    );

    if (!user.rows.length) {
      res.status(404);
      throw new Error("User not found.");
    }

    if (user.rows[0].role === "Mahasiswa") {
      const gamify = await GamifyPoints(user.rows[0].user_id, user.rows[0].npm);

      if (gamify !== 200) {
        res.status(500);
        throw new Error("Gamification Error.");
      }
    }

    const jabatanStruktural = await TrxUserJabatanUnit.findAll({
      where: {
        user_id: user.rows[0].user_id,
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

    const cleanJabatanStruktural = jabatanStruktural.map((jabatan) =>
      jabatan.get({ plain: true })
    );

    let dataUser = {
      ...user.rows[0],
      jabatanStruktural: cleanJabatanStruktural,
    };
    req.user = dataUser;

    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not Authorized");
  }
});

exports.protectedParents = asyncHandler(async (req, res, next) => {
  try {
    const { token } = req.headers;

    if (!token) {
      res.status(401);
      throw new Error("Not Authorized, Pleas login.");
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    const user = await Parents.findOne({
      where: {
        id: verified.id,
      },
    });

    if (!user) {
      res.status(404);
      throw new Error("User not found.");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not Authorized");
  }
});

exports.adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an admin.");
  }
});

exports.dosenOnly = asyncHandler(async (req, res, next) => {
  if (
    (req.user && req.user.role === "Dosen") ||
    req.user.role === "Dosen_Ext"
  ) {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an Dosen.");
  }
});

exports.mhsOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "Mahasiswa") {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an Dosen.");
  }
});

exports.adminDosenOnly = asyncHandler(async (req, res, next) => {
  if (
    (req.user && req.user.role === "Dosen") ||
    req.user.role === "Admin" ||
    req.user.role === "Dosen_Ext"
  ) {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an Dosen/Admin.");
  }
});

exports.adminMhsOnly = asyncHandler(async (req, res, next) => {
  if (
    (req.user && req.user.role === "Mahasiswa") ||
    req.user.role === "Admin"
  ) {
    next();
  } else {
    res.status(401);
    throw new Error("Not Authorized as an Mahasiswa.");
  }
});
