require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    user: process.env.USERDB,
    host: process.env.HOSTDB,
    database: process.env.DBNAME,
    password: process.env.PASSWORDDB,
    port: process.env.PORTDB || 5432,
  });

  try {
    console.log(`Connecting to database ${process.env.DBNAME}...`);
    console.log('Dropping public schema...');
    await pool.query('DROP SCHEMA public CASCADE');
    console.log('Recreating public schema...');
    await pool.query('CREATE SCHEMA public');
    console.log('Granting privileges on public schema...');
    await pool.query('GRANT ALL ON SCHEMA public TO public');
    console.log('Database schema successfully reset!');
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
