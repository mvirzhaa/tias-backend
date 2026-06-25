require('dotenv').config();
const db = require('./models');

async function checkTables() {
  try {
    const [results, metadata] = await db.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log("=== Tabel di m_tias_database ===");
    console.log(results);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkTables();
