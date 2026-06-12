require('dotenv').config();
const pool = require('../database');
async function check() {
  try {
    const res = await pool.query("SELECT user_agent, array_append(user_agent::text[], 'NewAgent')::text as appended FROM tb_users WHERE user_agent IS NOT NULL LIMIT 1");
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
