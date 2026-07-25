/**
 * DUMMY ACCOUNT SEEDER - untuk testing lokal
 * =============================================
 * Script ini membuat akun dummy untuk semua role yang ada:
 *  - Mahasiswa
 *  - Dosen
 *  - Dosen_Ext (Dosen Eksternal)
 *  - Pegawai
 *  - Admin
 *  - Parent (Orang Tua)
 *
 * Cara pakai:
 *   node scratch/seed_dummy_accounts.js
 *
 * Default password semua akun: Password123!
 */

require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// ─── DB CONNECTION ───────────────────────────────────────────────────────────
const pool = new Pool({
  user: process.env.USERDB,
  host: process.env.HOSTDB,
  database: process.env.DBNAME,
  password: process.env.PASSWORDDB,
  port: process.env.PORTDB,
});

const DB = {
  query: (text, params) => pool.query(text, params),
};

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DEFAULT_PASSWORD = "Password123!";
const NOW = new Date().toISOString();

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const dummyAccounts = [
  // ── MAHASISWA ──
  {
    role: "Mahasiswa",
    email: "mahasiswa@dummy.local",
    npm: "2021010001",
    nidn: null,
    nama_lengkap: "Budi Santoso (Dummy Mahasiswa)",
    jenkel: "L",
    tanggal_lahir: "2002-05-15",
    tempat_lahir: "Jakarta",
    agama: "Islam",
    no_hp: "081234567890",
    alamat: "Jl. Dummy No. 1, Bogor",
    kota_kabupaten: "Bogor",
    kode_mhs: "AKTIF",
    curr_code: "IF-2021",
    department_code: "TI",
    nip: null,
    isverified: true,
  },
  // ── MAHASISWI ──
  {
    role: "Mahasiswa",
    email: "mahasiswi@dummy.local",
    npm: "2021010002",
    nidn: null,
    nama_lengkap: "Siti Rahayu (Dummy Mahasiswi)",
    jenkel: "P",
    tanggal_lahir: "2003-08-20",
    tempat_lahir: "Bogor",
    agama: "Islam",
    no_hp: "081234567891",
    alamat: "Jl. Dummy No. 2, Bogor",
    kota_kabupaten: "Bogor",
    kode_mhs: "AKTIF",
    curr_code: "IF-2021",
    department_code: "TI",
    nip: null,
    isverified: true,
  },
  // ── DOSEN ──
  {
    role: "Dosen",
    email: "dosen@dummy.local",
    npm: null,
    nidn: "123456789",
    nama_lengkap: "Dr. Ahmad Fauzi, M.Kom (Dummy Dosen)",
    jenkel: "L",
    tanggal_lahir: "1980-03-10",
    tempat_lahir: "Bandung",
    agama: "Islam",
    no_hp: "081234567892",
    alamat: "Jl. Dosen No. 3, Bogor",
    kota_kabupaten: "Bogor",
    kode_mhs: "DOSEN",
    curr_code: null,
    department_code: "TI",
    nip: "198003102010011001",
    isverified: true,
  },
  // ── DOSEN EKSTERNAL ──
  {
    role: "Dosen_Ext",
    email: "dosen.ext@dummy.local",
    npm: null,
    nidn: null,
    nama_lengkap: "Prof. Budi Prakoso (Dummy Dosen Ext)",
    jenkel: "L",
    tanggal_lahir: "1975-07-22",
    tempat_lahir: "Surabaya",
    agama: "Islam",
    no_hp: "081234567893",
    alamat: "Jl. Ext No. 4, Jakarta",
    kota_kabupaten: "Jakarta",
    kode_mhs: null,
    curr_code: null,
    department_code: null,
    nip: "EXTDOSEN001",
    isverified: true,
    instansi_ext: "Universitas Dummy Indonesia",
  },
  // ── PEGAWAI ──
  {
    role: "Pegawai",
    email: "pegawai@dummy.local",
    npm: null,
    nidn: null,
    nama_lengkap: "Hendra Wijaya (Dummy Pegawai)",
    jenkel: "L",
    tanggal_lahir: "1985-11-05",
    tempat_lahir: "Bogor",
    agama: "Islam",
    no_hp: "081234567894",
    alamat: "Jl. Pegawai No. 5, Bogor",
    kota_kabupaten: "Bogor",
    kode_mhs: null,
    curr_code: null,
    department_code: "ADM",
    nip: "PGWDUMMY001",
    isverified: true,
  },
  // ── ADMIN ──
  {
    role: "Admin",
    email: "admin@dummy.local",
    npm: null,
    nidn: null,
    nama_lengkap: "Super Admin (Dummy Admin)",
    jenkel: "L",
    tanggal_lahir: "1990-01-01",
    tempat_lahir: "Bogor",
    agama: "Islam",
    no_hp: "081234567895",
    alamat: "Kantor Admin, Bogor",
    kota_kabupaten: "Bogor",
    kode_mhs: null,
    curr_code: null,
    department_code: null,
    nip: null,
    isverified: true,
  },
  // ── DEMO ──
  {
    role: "Demo",
    email: "demo@dummy.local",
    npm: null,
    nidn: null,
    nama_lengkap: "Demo User (Dummy Demo)",
    jenkel: "L",
    tanggal_lahir: "1995-06-15",
    tempat_lahir: "Bogor",
    agama: "Islam",
    no_hp: "081234567896",
    alamat: "Jl. Demo No. 7, Bogor",
    kota_kabupaten: "Bogor",
    kode_mhs: null,
    curr_code: null,
    department_code: null,
    nip: null,
    isverified: true,
  },
];

// ─── DUMMY PARENT ACCOUNTS (tabel tb_parents terpisah) ────────────────────
const dummyParents = [
  {
    role: "Parent",
    email: "parent@dummy.local",
    nama_lengkap: "Pak Santoso (Dummy Parent)",
    npm: "2021010001", // npm mahasiswa yang jadi anaknya
    no_hp: "081234567897",
    is_verified: true,
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function checkEmailExists(email) {
  const res = await DB.query("SELECT user_id FROM tb_users WHERE email = $1", [email]);
  return res.rows.length > 0;
}

async function checkEmailExistsParent(email) {
  const res = await DB.query("SELECT id FROM tb_parents WHERE email = $1", [email]);
  return res.rows.length > 0;
}

// ─── SEED USER ───────────────────────────────────────────────────────────────
async function seedUser(account) {
  const hashed = await hashPassword(DEFAULT_PASSWORD);
  const userId = uuidv4();

  // Cek apakah email sudah ada
  const exists = await checkEmailExists(account.email);
  if (exists) {
    console.log(`  ⚠️  [SKIP] Email sudah ada: ${account.email}`);
    return null;
  }

  // Insert ke tb_users
  const saveUser = await DB.query(
    `INSERT INTO tb_users(user_id, role, email, npm, nidn, password, isverified, curr_code, department_code, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING user_id, email, role`,
    [
      userId,
      account.role,
      account.email,
      account.npm || null,
      account.nidn || null,
      hashed,
      account.isverified,
      account.curr_code || null,
      account.department_code || null,
      NOW,
    ]
  );

  const savedUserId = saveUser.rows[0].user_id;

  // Insert ke tb_data_pribadi
  await DB.query(
    `INSERT INTO tb_data_pribadi(
       user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, agama,
       email, no_hp, alamat, kota_kabupaten, kode_mhs, nip, created_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      savedUserId,
      account.nama_lengkap,
      account.jenkel,
      account.tanggal_lahir,
      account.tempat_lahir,
      account.agama,
      account.email,
      account.no_hp,
      account.alamat,
      account.kota_kabupaten,
      account.kode_mhs || null,
      account.nip || null,
      NOW,
    ]
  );

  return saveUser.rows[0];
}

// ─── SEED PARENT ─────────────────────────────────────────────────────────────
async function seedParent(parent) {
  const hashed = await hashPassword(DEFAULT_PASSWORD);

  const exists = await checkEmailExistsParent(parent.email);
  if (exists) {
    console.log(`  ⚠️  [SKIP] Parent email sudah ada: ${parent.email}`);
    return null;
  }

  const saveParent = await DB.query(
    `INSERT INTO tb_parents(role, email, nama_lengkap, npm, no_hp, password, is_verified, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, role`,
    [
      parent.role,
      parent.email,
      parent.nama_lengkap,
      parent.npm,
      parent.no_hp,
      hashed,
      parent.is_verified,
      NOW,
    ]
  );

  return saveParent.rows[0];
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  🌱  DUMMY ACCOUNT SEEDER - TIAS Backend");
  console.log("=".repeat(60));
  console.log(`  Default password: ${DEFAULT_PASSWORD}`);
  console.log("=".repeat(60));

  // Test koneksi
  try {
    await pool.query("SELECT NOW()");
    console.log("  ✅  Database connected!\n");
  } catch (err) {
    console.error("  ❌  Database connection failed:", err.message);
    process.exit(1);
  }

  // Seed tb_users accounts
  console.log("📋  Seeding user accounts (tb_users + tb_data_pribadi)...\n");
  const results = [];

  for (const account of dummyAccounts) {
    process.stdout.write(`  ⏳  Membuat akun [${account.role}] ${account.email} ...`);
    try {
      const result = await seedUser(account);
      if (result) {
        console.log(` ✅ BERHASIL (user_id: ${result.user_id})`);
        results.push({ ...result, password: DEFAULT_PASSWORD });
      }
    } catch (err) {
      console.log(` ❌ GAGAL: ${err.message}`);
    }
  }

  // Seed tb_parents accounts
  console.log("\n📋  Seeding parent accounts (tb_parents)...\n");
  const parentResults = [];

  for (const parent of dummyParents) {
    process.stdout.write(`  ⏳  Membuat akun [${parent.role}] ${parent.email} ...`);
    try {
      const result = await seedParent(parent);
      if (result) {
        console.log(` ✅ BERHASIL (id: ${result.id})`);
        parentResults.push({ ...result, password: DEFAULT_PASSWORD });
      }
    } catch (err) {
      console.log(` ❌ GAGAL: ${err.message}`);
    }
  }

  // ── SUMMARY ──
  console.log("\n" + "=".repeat(60));
  console.log("  📊  SUMMARY AKUN DUMMY");
  console.log("=".repeat(60));
  console.log(
    `\n  ${"Role".padEnd(14)} | ${"Email".padEnd(30)} | Password`
  );
  console.log("  " + "-".repeat(62));

  for (const acc of dummyAccounts) {
    const statusCheck = await checkEmailExists(acc.email);
    const status = statusCheck ? "✅" : "❌";
    console.log(
      `  ${status} ${acc.role.padEnd(12)} | ${acc.email.padEnd(30)} | ${DEFAULT_PASSWORD}`
    );
  }
  console.log("  " + "-".repeat(62));
  for (const p of dummyParents) {
    const statusCheck = await checkEmailExistsParent(p.email);
    const status = statusCheck ? "✅" : "❌";
    console.log(
      `  ${status} ${"Parent".padEnd(12)} | ${p.email.padEnd(30)} | ${DEFAULT_PASSWORD}`
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("  🎉  Seeding selesai!");
  console.log("=".repeat(60));
  console.log("\n  Catatan:");
  console.log("  - Semua akun di atas sudah isverified = true (siap login)");
  console.log("  - Gunakan email + password di atas untuk login");
  console.log("  - Untuk menghapus dummy: node scratch/delete_dummy_accounts.js\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  pool.end();
  process.exit(1);
});
