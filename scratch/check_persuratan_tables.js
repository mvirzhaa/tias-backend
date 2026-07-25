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
  // 1. Cek apakah tabel persuratan sudah ada
  const tables = await p.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('tb_surat','tb_riwayat_surat','tb_dokumen_lampiran')
    ORDER BY table_name
  `);

  console.log("=== Cek Tabel Persuratan ===");
  if (tables.rows.length === 0) {
    console.log("❌ TIDAK ADA SATUPUN tabel persuratan di database!");
    console.log("   Tabel yang dibutuhkan:");
    console.log("   - tb_surat");
    console.log("   - tb_riwayat_surat");
    console.log("   - tb_dokumen_lampiran");
  } else {
    console.log("✅ Tabel yang ditemukan:", tables.rows.map((r) => r.table_name).join(", "));
    const missing = ["tb_surat", "tb_riwayat_surat", "tb_dokumen_lampiran"].filter(
      (t) => !tables.rows.find((r) => r.table_name === t)
    );
    if (missing.length) console.log("⚠️  Tabel yang KURANG:", missing.join(", "));
  }

  // 2. Cek ENUM yang diperlukan (status surat)
  const enums = await p.query(`
    SELECT typname FROM pg_type 
    WHERE typtype = 'e' AND typname ILIKE '%surat%'
  `);
  console.log("\n=== Cek ENUM Surat ===");
  if (enums.rows.length === 0) {
    console.log("❌ Tidak ada ENUM terkait surat.");
  } else {
    console.log("✅ ENUM:", enums.rows.map((r) => r.typname).join(", "));
  }

  // 3. Cek apakah ada folder lampiran
  const fs = require("fs");
  const path = require("path");
  const lampiranDir = path.join(__dirname, "../public/lampiran-surat");
  console.log("\n=== Cek Folder Upload ===");
  if (fs.existsSync(lampiranDir)) {
    console.log("✅ Folder lampiran-surat sudah ada:", lampiranDir);
  } else {
    console.log("⚠️  Folder lampiran-surat BELUM ada (akan dibuat otomatis saat first upload)");
  }

  await p.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  p.end();
});
