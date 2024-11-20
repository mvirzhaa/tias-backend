const Sequelize = require("sequelize");
const { siak } = require("./config");

const sequelize = new Sequelize(siak.database, siak.username, siak.password, {
  host: siak.host,
  dialect: siak.dialect,
  port: siak.port,
  benchmark: true,
  logging: false,

  timezone: "+07:00",
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Siak DB Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the siak db:", err.message);
  });

module.exports = sequelize;
