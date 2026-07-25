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
  const r = await p.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='tb_data_pribadi' ORDER BY ordinal_position"
  );
  console.log("tb_data_pribadi columns:");
  console.log(r.rows.map((x) => x.column_name).join(", "));

  const r2 = await p.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='tb_users' ORDER BY ordinal_position"
  );
  console.log("\ntb_users columns:");
  console.log(r2.rows.map((x) => x.column_name).join(", "));

  const r3 = await p.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='tb_parents' ORDER BY ordinal_position"
  );
  console.log("\ntb_parents columns:");
  console.log(r3.rows.map((x) => x.column_name).join(", "));

  await p.end();
}
main().catch((e) => {
  console.error(e.message);
  p.end();
});
