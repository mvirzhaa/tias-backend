const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.USERDB,
  host: process.env.HOSTDB,
  database: process.env.DBNAME_VOTING,
  password: process.env.PASSWORDDB,
  port: process.env.PORTDB,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
