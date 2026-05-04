const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  process.env.DBNAME,
  process.env.USERDB,
  process.env.PASSWORDDB,
  {
    host: process.env.HOSTDB,
    dialect: "postgres",
    port: process.env.PORTDB,
    benchmark: true,
    logging: function (sql, timeInMs) {
      console.log(timeInMs + "ms");
    },

    timezone: "+07:00",
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log("TIAS Database Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the TIAS Database:", err.message);
  });

module.exports = sequelize;
