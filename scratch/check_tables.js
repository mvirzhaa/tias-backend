require("dotenv").config();
const DB = require("../database");

async function main() {
  try {
    const res = await DB.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('tb_users', 'token');
    `);
    console.log("Triggers:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
