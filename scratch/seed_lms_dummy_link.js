/**
 * SEED LMS — Tautkan akun DUMMY ke kelas LMS yang sudah ada + isi materi contoh.
 * ============================================================================
 * Masalah: kelas LMS hasil seed sebelumnya tertaut ke nip/npm berbeda, sehingga
 * akun dummy dosen tak mengampu kelas apa pun & mahasiswa tak terdaftar di mana pun.
 * Akibatnya: dosen tak bisa tambah/edit/hapus, mahasiswa tak bisa lihat.
 *
 * Script ini (idempoten, aman dijalankan berulang):
 *   1. Menautkan dosen dummy (nip) sebagai pengampu kedua kelas yang ada.
 *   2. Menautkan mahasiswa & mahasiswi dummy (npm) sebagai peserta kedua kelas.
 *      → ditulis ke tabel STAGING (siak_sync_*) untuk daftar kelas, dan ke tabel
 *        proyeksi (siak_v2_*) yang dipakai otorisasi section/item.
 *   3. Mengisi materi contoh (topik + aktivitas) pada kelas TI-3A agar mahasiswa
 *      langsung punya yang bisa dilihat & dosen punya yang bisa diedit.
 *
 * Cara pakai:  node scratch/seed_lms_dummy_link.js
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
const q = (text, params) => pool.query(text, params);

// ─── Identitas akun dummy (lihat scratch/seed_dummy_accounts.js) ───────────────
const DOSEN_NIP = "198003102010011001";
const DOSEN_NAMA = "Dr. Ahmad Fauzi, M.Kom (Dummy Dosen)";
const MAHASISWA = [
  { npm: "2021010001", nama: "Budi Santoso (Dummy Mahasiswa)" },
  { npm: "2021010002", nama: "Siti Rahayu (Dummy Mahasiswi)" },
];

// Kelas yang sudah ada di DB (lihat siak_v2_classes / siak_sync_classes).
const KELAS = [
  { id: "11111111-1111-1111-1111-111111111111", nama: "TI-3A" }, // diisi materi contoh
  { id: "22222222-2222-2222-2222-222222222222", nama: "TI-2B" },
];
const KELAS_MATERI = "11111111-1111-1111-1111-111111111111";

// ─── Materi contoh (UUID tetap → idempoten via ON CONFLICT DO NOTHING) ─────────
const SECTIONS = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    pertemuan: 1,
    title: "Pengenalan & Kontrak Kuliah",
    description: "Topik pembuka: aturan, silabus, dan rencana pembelajaran semester.",
    is_published: true,
    position: 0,
    items: [
      {
        id: "b0000000-0000-4000-8000-000000000001",
        type: "page",
        title: "Sambutan & Kontrak Perkuliahan",
        description: "Baca dulu aturan kelas, bobot penilaian, dan rencana pembelajaran semester.",
        is_published: true,
        position: 0,
        payload: {
          html: "<h2>Selamat Datang</h2><p>Mata kuliah ini membahas <strong>Pemrograman Berorientasi Objek</strong>. Aturan kelas:</p><ul><li>Kehadiran minimal 75%.</li><li>Tugas dikumpulkan tepat waktu.</li><li>Aktif berdiskusi di forum.</li></ul>",
        },
      },
      {
        id: "b0000000-0000-4000-8000-000000000002",
        type: "url",
        title: "Grup Diskusi WhatsApp Kelas",
        description: "Gabung grup untuk pengumuman cepat dan tanya-jawab di luar jam kuliah.",
        is_published: true,
        position: 1,
        payload: { url: "https://chat.whatsapp.com/contoh", label: "Grup WhatsApp TI-3A", open_in_new_tab: true },
      },
      {
        id: "b0000000-0000-4000-8000-000000000003",
        type: "forum",
        title: "Forum Perkenalan Mahasiswa",
        description: "Perkenalkan diri kamu: nama, asal, dan harapan dari mata kuliah ini.",
        is_published: true,
        position: 2,
        payload: null,
      },
    ],
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    pertemuan: 2,
    title: "Konsep Dasar Objek & Kelas",
    description: "",
    is_published: true,
    position: 1,
    items: [
      {
        id: "b0000000-0000-4000-8000-000000000004",
        type: "video",
        title: "Video: OOP dalam 10 Menit",
        description: "Tonton video pengantar konsep objek & kelas sebelum sesi tatap muka.",
        is_published: true,
        position: 0,
        payload: { video_id: "pTB0EiLXUC8", title: "OOP dalam 10 Menit" },
      },
      {
        id: "b0000000-0000-4000-8000-000000000005",
        type: "assignment",
        title: "Tugas 1 — Membuat Diagram Kelas",
        description: "Buat diagram kelas sederhana untuk studi kasus perpustakaan. Kumpulkan pekan depan.",
        is_published: true,
        position: 1,
        payload: null,
      },
    ],
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    pertemuan: 3,
    title: "Encapsulation (draf, belum terbit)",
    description: "Contoh topik yang masih draf — hanya tampak bagi dosen.",
    is_published: false,
    position: 2,
    items: [],
  },
];

async function linkDosen(userId) {
  for (const k of KELAS) {
    // Staging (untuk daftar kelas /lms/classes).
    await q(
      `INSERT INTO siak_sync_class_lecturers (kelas_kuliah_id, nip, nama_dosen, is_koordinator, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       ON CONFLICT (kelas_kuliah_id, nip) DO NOTHING`,
      [k.id, DOSEN_NIP, DOSEN_NAMA]
    );
    // Proyeksi (untuk otorisasi section/item) — tambahkan nip ke array bila belum ada.
    await q(
      `UPDATE siak_v2_classes
       SET dosen_pengampu_nip = dosen_pengampu_nip || to_jsonb($2::text), updated_at = NOW()
       WHERE "kelasKuliahId" = $1 AND NOT jsonb_exists(dosen_pengampu_nip, $2)`,
      [k.id, DOSEN_NIP]
    );
    console.log(`  ✅ Dosen ${DOSEN_NIP} → pengampu kelas ${k.nama}`);
  }
}

async function linkMahasiswa() {
  for (const k of KELAS) {
    for (const m of MAHASISWA) {
      await q(
        `INSERT INTO siak_sync_class_participants (kelas_kuliah_id, npm, nama_mahasiswa, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'AKTIF', NOW(), NOW())
         ON CONFLICT (kelas_kuliah_id, npm) DO NOTHING`,
        [k.id, m.npm, m.nama]
      );
      await q(
        `INSERT INTO siak_v2_participants ("kelasKuliahId", npm, created_at, updated_at)
         SELECT $1::uuid, $2::varchar, NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM siak_v2_participants WHERE "kelasKuliahId" = $1::uuid AND npm = $2::varchar
         )`,
        [k.id, m.npm]
      );
      console.log(`  ✅ Mahasiswa ${m.npm} → peserta kelas ${k.nama}`);
    }
  }
}

async function seedMateri(idLecture) {
  for (const s of SECTIONS) {
    await q(
      `INSERT INTO lms_sections (id, "kelasKuliahId", pertemuan, id_lecture, title, description, position, is_published, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
       ON CONFLICT (id) DO NOTHING`,
      [s.id, KELAS_MATERI, s.pertemuan, idLecture, s.title, s.description || null, s.position, s.is_published]
    );
    for (const it of s.items) {
      await q(
        `INSERT INTO lms_content_items (id, section_id, type, title, description, position, is_published, payload, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
         ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()`,
        [it.id, s.id, it.type, it.title, it.description || null, it.position, it.is_published, it.payload ? JSON.stringify(it.payload) : null]
      );
    }
    console.log(`  ✅ Topik "${s.title}" (${s.items.length} aktivitas)`);
  }
}

async function main() {
  console.log("=".repeat(64));
  console.log("  🌱  SEED LMS — tautkan akun dummy + materi contoh");
  console.log("=".repeat(64));

  const dosen = await q(`SELECT user_id FROM tb_users WHERE email = 'dosen@dummy.local'`);
  if (!dosen.rows.length) {
    console.error("  ❌ Akun dosen@dummy.local tidak ditemukan. Jalankan seed_dummy_accounts.js dulu.");
    await pool.end();
    process.exit(1);
  }
  const idLecture = dosen.rows[0].user_id;
  console.log(`  ℹ️  Dosen user_id (id_lecture konten): ${idLecture}\n`);

  console.log("📌 Menautkan dosen sebagai pengampu...");
  await linkDosen(idLecture);

  console.log("\n📌 Menautkan mahasiswa sebagai peserta...");
  await linkMahasiswa();

  console.log(`\n📌 Mengisi materi contoh pada kelas TI-3A...`);
  await seedMateri(idLecture);

  console.log("\n" + "=".repeat(64));
  console.log("  🎉 Selesai. Uji alurnya:");
  console.log("     • Login dosen@dummy.local    → /dosen/pembelajaran (kelola TI-3A & TI-2B)");
  console.log("     • Login mahasiswa@dummy.local → /mahasiswa/pembelajaran (lihat materi TI-3A)");
  console.log("  Password semua: Password123!");
  console.log("=".repeat(64));

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  pool.end();
  process.exit(1);
});
