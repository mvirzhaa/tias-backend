require("dotenv").config();
const { Pool } = require("pg");
const p = new Pool({
  user: process.env.USERDB,
  host: process.env.HOSTDB,
  database: process.env.DBNAME,
  password: process.env.PASSWORDDB,
  port: process.env.PORTDB,
});

async function main() {
  // Cek kolom yang ADA di tb_data_pribadi
  const cols = await p.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='tb_data_pribadi' ORDER BY ordinal_position`
  );
  console.log("Kolom tb_data_pribadi:", cols.rows.map(r => r.column_name).join(", "));

  // Cek spesifik instansi_ext dan foto_narsum
  const missing = ["instansi_ext", "foto_narsum"];
  for (const col of missing) {
    const r = await p.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='tb_data_pribadi' AND column_name=$1`,
      [col]
    );
    console.log(`  ${col}: ${r.rows.length ? "✅ ADA" : "❌ TIDAK ADA"}`);
  }
  await p.end();
}
main().catch(e => { console.error(e.message); p.end(); });
