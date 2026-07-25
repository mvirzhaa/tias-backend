/**
 * Quick test — API Persuratan
 * Menguji GET /surat (harus 200, bukan 500)
 * Jalankan SAAT backend sedang running (npm run dev)
 */
require("dotenv").config();
const axios = require("axios");

const BASE = process.env.API_URL || "http://localhost:4242";

// Login dulu untuk dapat token
async function login(email, password) {
  const res = await axios.post(`${BASE}/auth/login`, { email, password });
  return res.data.data?.token;
}

async function testSurat(label, token) {
  try {
    const res = await axios.get(`${BASE}/surat`, {
      headers: { token },
      params: { page: 1, limit: 5 },
    });
    const body = res.data;
    console.log(`  ✅ [${label}] GET /surat → ${res.status} | totalData: ${body.data?.totalData ?? "?"}`);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    console.log(`  ❌ [${label}] GET /surat → ${status} | ${msg}`);
  }
}

async function main() {
  console.log("=".repeat(55));
  console.log("  🧪  Quick Test: API Persuratan");
  console.log(`  Backend: ${BASE}`);
  console.log("=".repeat(55));

  const accounts = [
    { label: "Mahasiswa", email: "mahasiswa@dummy.local" },
    { label: "Dosen",     email: "dosen@dummy.local" },
    { label: "Admin",     email: "admin@dummy.local" },
    { label: "Pegawai",   email: "pegawai@dummy.local" },
  ];

  for (const acc of accounts) {
    process.stdout.write(`\n  Login [${acc.label}] ${acc.email}... `);
    try {
      const token = await login(acc.email, "Password123!");
      console.log("✅ token didapat");
      await testSurat(acc.label, token);
    } catch (err) {
      console.log(`❌ Login gagal: ${err.response?.data?.message || err.message}`);
    }
  }

  console.log("\n" + "=".repeat(55));
  console.log("  🎉  Test selesai");
  console.log("=".repeat(55) + "\n");
}

main();
