module.exports = {
  development: {
    username: process.env.USERDB,
    password: process.env.PASSWORDDB,
    database: process.env.DBNAME,
    host: process.env.HOSTDB,
    dialect: "postgres",
  },
  test: {
    username: process.env.USERDB,
    password: process.env.PASSWORDDB,
    database: process.env.DBNAME,
    host: process.env.HOSTDB,
    dialect: "postgres",
  },
  production: {
    username: process.env.USERDB,
    password: process.env.PASSWORDDB,
    database: process.env.DBNAME,
    host: process.env.HOSTDB,
    dialect: "postgres",
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
