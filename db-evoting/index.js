const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "voting_db",
  password: process.env.PASSWORDDB,
  port: process.env.PORTDB,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
