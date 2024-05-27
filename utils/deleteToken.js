const DB = require("../database");

const deleteExpiredToken = async () => {
  const deleteQuery = await DB.query("DELETE FROM token");
  console.log(deleteQuery);
  console.log("token deleted!");
};

module.exports = {
  deleteExpiredToken,
};
