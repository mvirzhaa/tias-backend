const axios = require("axios");
const FormData = require("form-data");
const db = require("../../config");

/**
 * Jembatan presensi LMS -> sistem presensi lama (Laravel `fts-absen`, DB TERPISAH dari
 * tias-backend). Permintaan Pak Fitrah: presensi yang dibuka dari LMS harus menghasilkan
 * QR yang SAMA (di-scan via UCL Mobile, verifikasi wajah di app, submit ke
 * `fts-absen/absensi/scan-qr`) sehingga datanya otomatis tercatat juga di menu
 * Presensi/Daftar Hadir di luar LMS — TANPA perlu sinkronisasi tambahan, karena ini
 * literally baris yang sama, bukan salinan.
 *
 * CATATAN PENTING: `pembelajaran_dosen_ext`/`absensi_mhs` (tabel lokal Postgres tias-backend)
 * BUKAN target jembatan ini — itu tabel terpisah khusus dosen pengganti/eksternal (di luar
 * scope LMS, dikonfirmasi user). Target jembatan ini adalah API `fts-absen` (Laravel).
 *
 * Best-effort SELALU: `m_matakuliah` bisa tidak ada/tidak cocok di suatu environment, dan
 * Laravel `fts-absen` "labil" (bisa down) — kegagalan di sini TIDAK BOLEH menggagalkan
 * pembukaan sesi presensi LMS. Pemanggil wajib membungkus dengan try/catch & fallback ke
 * alur LMS native (token/wajah-di-browser) bila jembatan ini gagal/tak tersedia.
 */

// Resolusi id_matkul (INTEGER, m_matakuliah.id) dari kode_matakuliah SIAK v2 — SPEC v6 §3.0
// mengonfirmasi id_matkul lokal ini adalah id yang sama dipahami Laravel (fts-absen).
// 0 match atau >1 match (kode ambigu) dianggap TIDAK BISA dijembatani, bukan error keras —
// supaya matkul yang belum sinkron ke m_matakuliah tetap bisa presensi (fallback LMS native).
async function resolveIdMatkul(kodeMatakuliah) {
  const kode = kodeMatakuliah && String(kodeMatakuliah).trim();
  if (!kode) return null;

  try {
    const [rows] = await db.query(
      `SELECT id FROM m_matakuliah
       WHERE deleted_at IS NULL
         AND upper(btrim(kode_matakuliah)) = upper(btrim(:kode))`,
      { replacements: { kode } }
    );
    if (rows.length !== 1) return null;
    return rows[0].id;
  } catch (error) {
    // m_matakuliah tak ada/tak terjangkau di environment ini -> tak bisa dijembatani.
    return null;
  }
}

// POST fts-absen/pembelajaran/store — kontrak & convention SAMA dgn
// controllers/absensi/pembelajaranController.js#storePembelajaran (proxy yang sudah ada)
// dan fe-ucl generate.jsx (id_lecture = parseInt(nip), status_kelas '0'=offline/'1'=online).
async function createLegacyPembelajaran({ nikDosen, idMatkul, kelasNama, pertemuanKe, isOffline }) {
  if (!process.env.API_LOCAL_ABSEN) {
    throw new Error("API_LOCAL_ABSEN belum dikonfigurasi.");
  }
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/store`;

  const formData = new FormData();
  formData.append("nik_dosen", nikDosen);
  formData.append("kelas", kelasNama);
  formData.append("pertemuan", pertemuanKe);
  formData.append("status_kelas", isOffline ? "0" : "1");
  formData.append("id_matkul", idMatkul);
  formData.append("id_lecture", parseInt(String(nikDosen).trim(), 10) || nikDosen);

  const response = await axios.post(API_URL, formData, {
    headers: formData.getHeaders(),
    timeout: 8000,
  });

  const token = response.data && response.data.data && response.data.data.token;
  if (!token) {
    const msg = (response.data && response.data.message) || "Laravel tidak mengembalikan token.";
    throw new Error(msg);
  }
  return { token: String(token) };
}

module.exports = { resolveIdMatkul, createLegacyPembelajaran };
