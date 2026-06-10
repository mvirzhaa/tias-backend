# SPEC v7 — Modul Pembelajaran (LMS SPADA-style) — UCL UIKA / TIAS

**Status:** Final pasca-penemuan API SIAK v2. Dokumen ini MENGGANTIKAN SEMUA asumsi pada v6 ke bawah.

**Perubahan Arsitektur Mayor dari v6 (MIGRASI SIAK V2):**
1. **API SIAK Berubah Total:** Kita tidak lagi menggunakan `172.16.18.162` (`API_LOCAL_ABSEN`). Kita menggunakan SIAK v2 di `https://api-siak.uika-bogor.ac.id/api`.
2. **Kunci Penautan Kelas Berubah:** Tidak lagi menggunakan komposit `id_matkul` (INTEGER) dan `kelas` (STRING). SIAK v2 menggunakan **UUID Tunggal** bernama `kelasKuliahId` untuk merepresentasikan satu kelas.
3. **Autentikasi SIAK v2:** Membutuhkan **Bearer Token**. Akses public tanpa token akan ditolak (401). Backend UCL harus login terlebih dahulu atau menyalurkan token dari JWT.
4. **Endpoint Otorisasi Berubah:**
   - Jadwal Dosen (Otorisasi Dosen): `GET /dosen/jadwal-akademik/minggu`
   - Daftar Peserta (Otorisasi Mhs): `GET /akademik/kelas-kuliah/{kelasKuliahId}/participant`

> ⚠️ **UNTUK AGENT (CLAUDE CODE):**
> 1. JANGAN menggunakan rute lama (`/dosen-for-mk` atau `/pembelajaran/list-absen`).
> 2. JANGAN menggunakan relasi `id_matkul` dan `kelas` pada model `lms_sections`. Ubah model `lms_sections` menjadi menggunakan `kelasKuliahId` (UUID).
> 3. Buat utilitas khusus (`SiakService`) untuk mengelola koneksi dan token ke SIAK v2.
> 4. Default DENY pada semua otorisasi bila API SIAK down.

---

## 1. IDENTITAS & ROLE

- `tb_users` (UUID: `user_id`): Digunakan sebagai kepemilikan konten secara internal.
- `tb_data_pribadi` (NIP/NIK): Tersedia dari `authMiddleware` via `req.user.nip`. Digunakan (jika diperlukan) untuk validasi tambahan.
- Di SIAK v2, token Bearer yang didapatkan dari proses `/api/auth/login` sudah memuat konteks otorisasi Dosen.

| Role | Hak |
|---|---|
| Admin | Seluruh kelas/matkul. |
| Dosen/Dosen_Ext | Kelola konten HANYA pada `kelasKuliahId` yang ada di jadwalnya. |
| Mahasiswa | Lihat materi kelas yang diikutinya (terdaftar sebagai *participant*). |

---

## 2. OTORISASI (Inti Keamanan via SIAK V2)

### 2.1 SiakService (Mekanisme Token) - WAJIB
Sebelum mengakses *endpoint* SIAK v2, UCL membutuhkan token.
- **Implementasi:** Buat modul utilitas (misal `utils/SiakService.js`) yang bertugas melakukan *login* ke `https://api-siak.uika-bogor.ac.id/api/auth/login` menggunakan kredensial sistem atau meneruskan kredensial dosen, kemudian menyimpan (menyematkan) Bearer Token tersebut ke semua permintaan Axios.
- **Payload Login:** `{ "username": "...", "password": "..." }`.

### 2.2 Dosen "pengampu utama kelas ini?" — `lecturerOwnsClass`
- **Identitas konten:** Simpan `id_lecture` = `req.user.user_id` (UUID) di tabel `lms_sections` saat membuat materi.
- **Verifikasi kepemilikan:** Panggil `GET /dosen/jadwal-akademik/minggu` di SIAK v2 menggunakan Bearer Token dari `SiakService`.
- **Cek:** Pastikan `kelasKuliahId` yang diminta ada di dalam respons jadwal tersebut.
- ⚠️ Tolak jika tidak ditemukan. Admin bypass aturan ini.

### 2.3 Mahasiswa "terdaftar di kelas ini?" — `studentEnrolled`
- **Endpoint:** Panggil `GET /akademik/kelas-kuliah/{kelasKuliahId}/participant` di SIAK v2.
- **Cek:** Verifikasi apakah `npm` atau identitas `req.user` mahasiswa terdapat dalam respons list peserta tersebut.
- WAJIB buat **Cache Fallback** (`lms_enrollment_cache`) agar mahasiswa tetap bisa belajar jika API SIAK v2 mengalami *down* sementara.

---

## 3. MODEL DATA (DIPERBARUI)

### 3.1 `lms_sections`
Rancangan ulang tabel karena SIAK v2:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | PK |
| `kelasKuliahId` | UUID | **[BARU]** Kunci tunggal SIAK v2. Menggantikan `id_matkul` dan `kelas`. |
| `pertemuan` | INTEGER | 1..14/16 |
| `semester` | STRING | Dari config lokal |
| `id_lecture` | UUID | = user_id dosen (kepemilikan konten) |
| `title`, `description`, `position`, `is_published` | ... | ... |
| `created_at/updated_at` | DATE | |

- **Catatan Migrasi Agent:** Jika sebelumnya agen sudah mulai membuat `id_matkul` dan `kelas`, rombak total *schema* / *migrations*-nya menjadi `kelasKuliahId` (tipe UUID).

### 3.2 `lms_content_items`
`id` (UUID) · `section_id` (FK ke lms_sections.id) · `type` (enum) · `title` · `position` · `is_published` · `payload` (JSONB) · timestamps.

### 3.3 Cache Tabel (`lms_class_cache` & `lms_enrollment_cache`)
Sesuaikan skema cache agar menyimpan relasi berdasarkan `kelasKuliahId` (UUID), bukan lagi kombinasi manual integer dan string.

---

## 4. URUTAN PENGERJAAN BARU UNTUK AGENT

- **Fase 0.5 (Auth SIAK):** Buat utilitas `SiakService` menggunakan *Axios* untuk melakukan `POST /auth/login` ke SIAK v2, menerima token Bearer, dan melakukan *intercept* untuk memasukkan token tersebut pada permintaan ke SIAK selanjutnya. Konfigurasi `SIAK_V2_API_URL` di `.env`.
- **Fase 1 (Otorisasi Dosen):** Modifikasi `lms_sections` (gunakan `kelasKuliahId`). Buat *middleware* `lecturerOwnsClass` yang menembak `GET /dosen/jadwal-akademik/minggu`.
- **Fase 2 (Validasi Mahasiswa):** Buat `studentEnrolled` yang menembak `/akademik/kelas-kuliah/{kelasKuliahId}/participant`. Bangun *cache* sinkronisasinya.
- **Fase 3-7 (Konten):** Kerjakan CRUD Page, PDF, PPT, Video, URL, Assignment, dan Forum sesuai standar `lms_content_items` pada v6.

---

## 5. CATATAN KEJUJURAN TEKNIS
Perpindahan ke UUID `kelasKuliahId` adalah anugerah arsitektural. Masalah "loose equality" (`==` vs `===`) yang rumit akibat pencocokan string `kelas` dan integer `id_matkul` dari SIAK lama **telah musnah**. Otorisasi kini jauh lebih solid berkat satu *unique identifier* standar yang diberikan oleh SIAK v2.
