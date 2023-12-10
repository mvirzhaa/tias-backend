const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// hash token
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token.toString()).digest("hex");
};

// unix timestamp
const unixTimestamp = Math.floor(Date.now() / 1000);
const dateToUnix = (date) => {
  return Date.parse(date) / 1000;
};

// expires at
const expires_at = Math.floor((Date.now() + 3600000) / 1000);

// Convert unixtimetamp
const convertDate = (unixTimestamp) => {
  return new Date(unixTimestamp * 1000);
};

module.exports = {
  generateToken,
  hashToken,
  unixTimestamp,
  expires_at,
  convertDate,
  dateToUnix,
};
