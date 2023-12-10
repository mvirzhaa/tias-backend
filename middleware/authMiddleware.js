const asyncHandler = require("express-async-handler");
const DB = require("../database");
const jwt = require("jsonwebtoken");

exports.protected = asyncHandler(async (req, res, next) => {
  try {
    // dev/test
    // const { token } = req.cookies;

    // Production
    const { token } = req.headers;

    if (!token) {
      res.status(401);
      throw new Error("Not Authorized, Pleas login.");
    }

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // Get user id from token
    const user = await DB.query(
      "SELECT user_id, npm, nidn, email, role, isverified, created_at FROM tb_users where user_id = $1",
      [verified.id]
    );

    if (!user.rows.length) {
      res.status(404);
      throw new Error("User not found.");
    }

    req.user = user.rows[0];
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
  if (req.user && req.user.role === "Dosen") {
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
  if ((req.user && req.user.role === "Dosen") || req.user.role === "Admin") {
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
