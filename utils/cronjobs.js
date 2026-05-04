const cron = require("node-cron");
const { Op } = require("sequelize");
const Parents = require("../models/Parents");
const Token = require("../models/token");

const cleanupExpiredTokens = async () => {
  try {
    const expirationTime = Date.now() - 5 * 60 * 1000;

    await Parents.update(
      { verif_token: null },
      {
        where: {
          verif_token: { [Op.ne]: null },
          updated_at: { [Op.lt]: new Date(expirationTime) },
        },
      }
    );

    console.log("Expired verification tokens have been cleared.");
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
  }
};

const cleanupExpiredTokensUsers = async () => {
  try {
    const expirationTime = new Date();

    const result = await Token.destroy({
      where: {
        expires_at: {
          [Op.lt]: expirationTime,
        },
      },
    });

    console.log(`${result} expired tokens users have been cleared.`);
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
  }
};
cron.schedule("*/5 * * * *", cleanupExpiredTokens);
cron.schedule("*/2 * * * *", cleanupExpiredTokensUsers);

module.exports = {
  cleanupExpiredTokens,
  cleanupExpiredTokensUsers,
};
