require('dotenv').config();
const { Pool } = require('pg');

async function checkDb(dbName) {
  console.log(`\n================ DATABASE: ${dbName} ================`);
  const pool = new Pool({
    user: process.env.USERDB,
    host: process.env.HOSTDB,
    database: dbName,
    password: process.env.PASSWORDDB,
    port: process.env.PORTDB,
  });

  try {
    // 1. Check tables
    const tableRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("Tables:");
    console.log(tableRes.rows.map(r => r.table_name));

    // 2. Check if tb_parents exists
    const hasParents = tableRes.rows.some(r => r.table_name === 'tb_parents');
    if (hasParents) {
      console.log("-> tb_parents EXISTS!");
      const countRes = await pool.query("SELECT COUNT(*) FROM tb_parents");
      console.log(`-> tb_parents count: ${countRes.rows[0].count}`);
    } else {
      console.log("-> tb_parents does NOT exist");
    }
  } catch (err) {
    console.error(`Error connecting/querying database ${dbName}:`, err.message);
  } finally {
    await pool.end();
  }
}

async function run() {
  await checkDb(process.env.DBNAME);
  await checkDb(process.env.DBNAME_BIMBINGAN);
  await checkDb(process.env.DBNAME_VALIDASI_DIGITAL);
  process.exit(0);
}

run();
