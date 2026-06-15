/**
 * DELETE DUMMY ACCOUNTS - untuk membersihkan akun dummy lokal
 * =============================================================
 * Cara pakai:
 *   node scratch/delete_dummy_accounts.js
 */

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.USERDB,
  host: process.env.HOSTDB,
  database: process.env.DBNAME,
  password: process.env.PASSWORDDB,
  port: process.env.PORTDB,
});

const DUMMY_EMAILS = [
  "mahasiswa@dummy.local",
  "mahasiswi@dummy.local",
  "dosen@dummy.local",
  "dosen.ext@dummy.local",
  "pegawai@dummy.local",
  "admin@dummy.local",
  "demo@dummy.local",
];

const DUMMY_PARENT_EMAILS = ["parent@dummy.local"];

async function main() {
  console.log("=".repeat(50));
  console.log("  🗑️  DELETE DUMMY ACCOUNTS");
  console.log("=".repeat(50));

  try {
    await pool.query("SELECT NOW()");
    console.log("  ✅  Database connected!\n");
  } catch (err) {
    console.error("  ❌  Connection failed:", err.message);
    process.exit(1);
  }

  // Hapus dari tb_data_pribadi dulu (FK)
  for (const email of DUMMY_EMAILS) {
    const user = await pool.query("SELECT user_id FROM tb_users WHERE email = $1", [email]);
    if (user.rows.length) {
      const uid = user.rows[0].user_id;
      await pool.query("DELETE FROM tb_data_pribadi WHERE user_id = $1", [uid]);
      await pool.query("DELETE FROM token WHERE user_id = $1", [uid]);
      await pool.query("DELETE FROM tb_users WHERE user_id = $1", [uid]);
      console.log(`  ✅  Deleted: ${email}`);
    } else {
      console.log(`  ⚠️  Not found: ${email}`);
    }
  }

  // Hapus parent
  for (const email of DUMMY_PARENT_EMAILS) {
    const res = await pool.query("DELETE FROM tb_parents WHERE email = $1 RETURNING email", [email]);
    if (res.rows.length) {
      console.log(`  ✅  Deleted parent: ${email}`);
    } else {
      console.log(`  ⚠️  Parent not found: ${email}`);
    }
  }

  console.log("\n  🎉  Selesai!\n");
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  pool.end();
  process.exit(1);
});
