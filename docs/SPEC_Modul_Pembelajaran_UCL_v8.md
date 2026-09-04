# SPEC v8 — Modul Pembelajaran (LMS SPADA-style) — UCL UIKA / TIAS

**Status:** Final pasca-kesepakatan *Full Sync* dengan Tim SIAK. Dokumen ini MENGGANTIKAN SEMUA versi V7 ke bawah.

**Penekanan produk:** Modul Pembelajaran ini adalah **LMS SPADA-style untuk UCL**. Maksudnya, pola pengalaman belajar mengikuti konsep SPADA: user masuk ke kelas kuliah, melihat topik/pertemuan, lalu mengakses aktivitas atau sumber belajar di dalam topik tersebut. Ini bukan sekadar CRUD/upload file, dan bukan klaim sebagai SPADA resmi/aggregator Kemdikbud.

Prinsip UI/UX yang harus dijaga:
- Kelas kuliah menjadi pintu masuk utama.
- Struktur belajar di dalam kelas berbasis topik/pertemuan/minggu.
- Setiap topik berisi item pembelajaran: page, PDF, PPT, video, URL, forum, assignment, dan exam/quiz saat siap.
- Dosen mengelola konten pada kelas yang dia ampu.
- Mahasiswa hanya membaca/mengikuti aktivitas pada kelas yang dia ambil.
- Admin memantau dan mengelola sesuai scope universitas/fakultas/prodi.

**Perubahan Arsitektur Mayor (FULL SYNC):**
Berdasarkan kesepakatan terbaru dengan Tim SIAK, **kita tidak lagi menggunakan metode Live Proxy** (dimana UCL menembak API SIAK setiap kali *user* membuka halaman). 
SIAK v2 akan menyediakan satu atau beberapa *endpoint* khusus (*bulk*) untuk menyedot seluruh data Mata Kuliah, Kelas, Jadwal, dan Peserta Kelas. Data tersebut akan **disimpan permanen secara lokal di UCL** melalui sebuah fitur *Synchronize*.

> ⚠️ **UNTUK AGENT (CLAUDE CODE):**
> 1. JANGAN membangun *middleware* yang mengecek otorisasi langsung ke API SIAK (`API_LOCAL_ABSEN` atau `SIAK_V2_API_URL`) secara *live*.
> 2. Pengecekan otorisasi kepemilikan dosen (`lecturerOwnsClass`) dan keanggotaan mahasiswa (`studentEnrolled`) **HARUS** membaca tabel lokal PostgreSQL.
> 3. Buat satu *endpoint* admin (misal `POST /api/lms/sync-siak`) yang akan bertugas menarik data dari SIAK V2 lalu meng-*update*/*insert* ke tabel lokal.
> 4. Kunci utama untuk semua relasi LMS tetap memakai **UUID (`kelasKuliahId`)**.

---

## 1. IDENTITAS & ROLE

- `tb_users` (UUID: `user_id`): Identitas kepemilikan konten di LMS.
- `tb_data_pribadi` (`nip` / `npm`): Digunakan untuk mencocokkan *user* TIAS dengan data yang disinkronisasi dari SIAK.

| Role | Hak |
|---|---|
| Admin | Bisa memicu tombol *Synchronize*. Seluruh kelas terbuka. |
| Dosen/Dosen_Ext | Kelola konten HANYA pada `kelasKuliahId` yang tercatat miliknya di tabel lokal. |
| Mahasiswa | Lihat materi kelas yang diikutinya (berdasarkan tabel lokal). |

---

## 2. TABEL LOKAL SEBAGAI SUMBER KEBENARAN (SOURCE OF TRUTH)

Karena kita menggunakan metode *Full Sync*, agen Claude Code wajib membuat *model* dan *migration* untuk tabel-tabel penyimpan data SIAK ini di UCL.

### 2.1 `siak_v2_classes` (Menyimpan Data Jadwal & Kelas)
Tabel ini diisi murni dari hasil tarikan "Tombol Synchronize".
| Kolom | Tipe | Keterangan |
|---|---|---|
| `kelasKuliahId` | UUID | **PK** (Dari SIAK V2) |
| `kode_matakuliah` | STRING | Untuk tampilan frontend |
| `nama_matakuliah` | STRING | Untuk tampilan frontend |
| `nama_kelas` | STRING | Untuk tampilan frontend |
| `dosen_pengampu_nip` | JSONB | Array string berisi NIP dosen pengampu |
| `semester` | STRING | Periode akademik |

### 2.2 `siak_v2_participants` (Menyimpan Daftar Peserta)
Diisi murni dari hasil tarikan "Tombol Synchronize".
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | INTEGER | **PK**, AutoInc |
| `kelasKuliahId` | UUID | FK ke `siak_v2_classes.kelasKuliahId` |
| `npm` | STRING | Nomor Pokok Mahasiswa dari SIAK V2 |

### 2.3 `lms_sections` (Materi Kelas LMS)
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | PK |
| `kelasKuliahId` | UUID | FK ke `siak_v2_classes.kelasKuliahId` |
| `pertemuan` | INTEGER | 1..14/16 |
| `id_lecture` | UUID | Pembuat materi (FK ke tb_users.user_id) |
| `title`, `description` | ... | |

### 2.4 `lms_content_items`
`id` (UUID) · `section_id` (FK ke lms_sections.id) · `type` (enum) · `title` · `position` · `is_published` · `payload` (JSONB).

---

## 3. OTORISASI (Super Cepat via Database Lokal)

Otorisasi LMS tidak perlu menunggu koneksi ke API SIAK.

### 3.1 Dosen "pengampu utama kelas ini?" — `lecturerOwnsClass`
- Dapatkan `kelasKuliahId` dari *request parameter*.
- Ambil `req.user.nip` (NIP Dosen yang sedang login).
- Cek di tabel `siak_v2_classes`: Cari *record* dengan `kelasKuliahId` tersebut, lalu pastikan `req.user.nip` ada di dalam _array_ `dosen_pengampu_nip`.
- Jika cocok, izinkan. Jika tidak, tolak (403).

### 3.2 Mahasiswa "terdaftar di kelas ini?" — `studentEnrolled`
- Dapatkan `kelasKuliahId` dari *request parameter*.
- Ambil `req.user.npm` (NPM Mahasiswa yang sedang login).
- Cek di tabel `siak_v2_participants`: Apakah ada *record* dengan kombinasi `kelasKuliahId` dan `npm` tersebut?
- Jika ada, izinkan. Jika tidak, tolak (403).

---

## 4. ALUR KERJA (ETL SINKRONISASI) - FASE 0

Agen harus membuat fungsi `syncSiakV2Data()` yang dipanggil lewat `POST /api/lms/sync-siak`:
1. Minta Token Admin dari SIAK V2 (Gunakan satu *Service Account* global yang diatur di `.env`, BUKAN akun *user* yang sedang login).
2. Tembak *endpoint* massal SIAK V2 yang menyajikan seluruh kelas dan pesertanya (menunggu detail URL pasti dari Mas Syaifullah).
3. Hapus (atau *Upsert*) data lama di tabel `siak_v2_classes` dan `siak_v2_participants`.
4. Masukkan (*bulk insert*) data terbaru ke tabel tersebut.

---

## 5. URUTAN PENGERJAAN UNTUK AGENT

- **Fase 0 (Sinkronisasi & Model):** Buat model `siak_v2_classes` dan `siak_v2_participants`. Buat *endpoint* `POST /api/lms/sync-siak` untuk menarik data *dummy* / *mock* sementara menunggu URL asli dari Tim SIAK.
- **Fase 1 (Otorisasi Lokal):** Buat `lms_sections` yang berelasi ke `kelasKuliahId`. Bangun *middleware* `lecturerOwnsClass` dan `studentEnrolled` yang murni melakukan *query* ke PostgreSQL lokal.
- **Fase 2-6 (Konten):** Kerjakan CRUD Page, PDF, PPT, Video, URL, Assignment, dan Forum persis seperti rancangan V6.
