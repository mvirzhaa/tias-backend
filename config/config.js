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
};
