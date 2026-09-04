// Sebelumnya tidak ada `pool` sama sekali di environment manapun -> default Sequelize
// (max: 5). Terbukti jadi bottleneck staging di beban tinggi (lihat config/index.js).
const pool = {
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
  acquire: parseInt(process.env.DB_POOL_ACQUIRE_MS, 10) || 30000,
  idle: parseInt(process.env.DB_POOL_IDLE_MS, 10) || 10000,
};

module.exports = {
  development: {
    username: process.env.USERDB,
    password: process.env.PASSWORDDB,
    database: process.env.DBNAME,
    host: process.env.HOSTDB,
    dialect: "postgres",
    pool,
  },
  test: {
    username: process.env.USERDB,
    password: process.env.PASSWORDDB,
    database: process.env.DBNAME,
    host: process.env.HOSTDB,
    dialect: "postgres",
    pool,
  },
  staging: {
    username: process.env.USERDB,
    password: process.env.PASSWORDDB,
    database: process.env.DBNAME,
    host: process.env.HOSTDB,
    dialect: "postgres",
    pool,
  },
  production: {
    username: process.env.USERDB,
    password: process.env.PASSWORDDB,
    database: process.env.DBNAME,
    host: process.env.HOSTDB,
    dialect: "postgres",
    pool,
  },
  siak: {
    username: process.env.SIAK_DB_USERNAME,
    password: process.env.SIAK_DB_PASSWORD,
    database: process.env.SIAK_DB_DATABASE,
    host: process.env.SIAK_DB_HOST,
    port: process.env.SIAK_DB_PORT,
    dialect: process.env.SIAK_DB_CONNECTION || "mysql",
  },
};
