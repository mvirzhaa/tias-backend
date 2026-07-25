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
  console.log("\n=== tb_users (dummy) ===");
  const r = await p.query(
    `SELECT u.role, u.email, u.isverified, d.nama_lengkap 
     FROM tb_users u 
     LEFT JOIN tb_data_pribadi d ON u.user_id = d.user_id 
     WHERE u.email LIKE '%dummy.local%' 
     ORDER BY u.role`
  );
  console.table(r.rows);

  console.log("\n=== tb_parents (dummy) ===");
  const r2 = await p.query(
    `SELECT role, email, nama_lengkap, is_verified FROM tb_parents WHERE email LIKE '%dummy.local%'`
  );
  console.table(r2.rows);

  await p.end();
}
main().catch((e) => { console.error(e.message); p.end(); });
