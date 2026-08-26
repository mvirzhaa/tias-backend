const Sequelize = require("sequelize");

const isProdLike = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging";

const sequelize = new Sequelize(
  process.env.DBNAME,
  process.env.USERDB,
  process.env.PASSWORDDB,
  {
    host: process.env.HOSTDB,
    dialect: "postgres",
    port: process.env.PORTDB,
    // Sebelumnya tidak diset sama sekali -> default Sequelize (pool.max=5). Di beban tinggi
    // (stress test 1000 VU ke staging), ini terbukti jadi bottleneck: request mengantre
    // menunggu koneksi, latensi p95 melonjak ke puluhan detik & banyak timeout/connection
    // refused. Dinaikkan agar sebanding dengan jumlah worker/VU bersamaan yang realistis.
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE_MS, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE_MS, 10) || 10000,
    },
    benchmark: !isProdLike,
    logging: isProdLike
      ? false
      : function (sql, timeInMs) {
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
