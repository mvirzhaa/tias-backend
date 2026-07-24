const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// generate token
const generateToken = (id, eportalUserId = null) => {
  const payload = { id };
  if (eportalUserId) payload.eportal_user_id = eportalUserId;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
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
const currentTimeMillis = Date.now();

const oneMonthMillis = 30 * 24 * 60 * 60 * 1000; 
const expiresMillis = currentTimeMillis + oneMonthMillis;

const expiresInSeconds = Math.floor(expiresMillis / 1000);

const expires_at = expiresInSeconds;


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
