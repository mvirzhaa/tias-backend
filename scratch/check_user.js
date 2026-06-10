require('dotenv').config();
const DB = require("../database");

async function check() {
  try {
    const res = await DB.query("SELECT * FROM achievements LIMIT 1");
    console.log("Achievements exists:", res.rows);
  } catch (err) {
    console.error("Error achievements:", err.message);
  } 
  try {
    const res2 = await DB.query("SELECT * FROM \"TrxUserJabatanUnits\" LIMIT 1");
    console.log("TrxUserJabatanUnits exists:", res2.rows);
  } catch (err) {
    console.error("Error TrxUserJabatanUnits:", err.message);
  } 
  process.exit();
}

check();
