const axios = require("axios");
const FormData = require("form-data");

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
 * `id_matkul` KETERANGAN PENTING (revisi setelah dicek ke production): percobaan awal
 * meresolve `id_matkul` (INTEGER) lewat tabel lokal `m_matakuliah` GAGAL TOTAL karena tabel
 * itu KOSONG (0 baris) di production — bukan cuma satu matkul yang belum termapping, semua
 * kelas selalu unmapped. Dicek ulang ke `fe-ucl/src/pages/dosen/absen/daftar-hadir/generate.jsx`
 * (halaman generate QR presensi lama yang SUDAH JALAN di produksi): field `id_matkul` yang
 * dikirim ke `fts-absen/pembelajaran/store` sebenarnya adalah KODE matkul dari SIAK (string,
 * mis. "TIF223"), BUKAN id integer `m_matakuliah`. Laravel-nya sendiri cuma cek truthy, tidak
 * validasi FK. Jadi di sini kita kirim `kode_matakuliah` SIAK v2 apa adanya — TIDAK ADA lagi
 * ketergantungan ke `m_matakuliah` lokal.
 *
 * Best-effort SELALU: Laravel `fts-absen` "labil" (bisa down) — kegagalan di sini TIDAK BOLEH
 * menggagalkan pembukaan sesi presensi LMS. Pemanggil wajib membungkus dengan try/catch &
 * fallback ke alur LMS native (token/wajah-di-browser) bila jembatan ini gagal/tak tersedia.
 */

// POST fts-absen/pembelajaran/store — kontrak & convention SAMA dgn
// controllers/absensi/pembelajaranController.js#storePembelajaran (proxy yang sudah ada)
// dan fe-ucl generate.jsx (id_matkul = KODE matkul string, id_lecture = parseInt(nip),
// status_kelas '0'=offline/'1'=online).
async function createLegacyPembelajaran({ nikDosen, kodeMatakuliah, kelasNama, pertemuanKe, isOffline }) {
  if (!process.env.API_LOCAL_ABSEN) {
    throw new Error("API_LOCAL_ABSEN belum dikonfigurasi.");
  }
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/store`;

  const formData = new FormData();
  formData.append("nik_dosen", nikDosen);
  formData.append("kelas", kelasNama);
  formData.append("pertemuan", pertemuanKe);
  formData.append("status_kelas", isOffline ? "0" : "1");
  formData.append("id_matkul", kodeMatakuliah);
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

module.exports = { createLegacyPembelajaran };
