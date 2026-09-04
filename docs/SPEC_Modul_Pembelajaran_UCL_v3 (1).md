# SPEC v3 — Modul Pembelajaran (LMS SPADA-style) — UCL UIKA / TIAS

**Cakupan TETAP:** modul LMS materi (Page, PPT, PDF, Video, URL, Forum, Tugas; Ujian→CBT fase akhir). Catatan otorisasi adalah masukan untuk lapisan otorisasi modul ini — BUKAN proyek perbaikan presensi terpisah.

**Perubahan dari v2:** Fase 0 dinaikkan jadi **DECISION GATE** karena status tabel `pembelajaran_dosen_ext` belum dipastikan. Struktur respons SIAK sudah dikonfirmasi & dikunci.

> ⚠️ **UNTUK AGENT (CLAUDE CODE) — BACA INI DULU:**
> 1. Mulai dari **FASE 0**. Ini bukan pemanasan — ini gerbang keputusan. JANGAN menulis migrasi/model/controller apa pun sebelum Fase 0 selesai DAN user memilih cabang desain.
> 2. **BERHENTI dan tanya user** bila nama kolom/tabel di spec ini tidak cocok dengan kondisi riil. Jangan menebak, jangan diam-diam menyesuaikan.
> 3. Backend ini banyak proxy ke API Laravel (`fts-absen`). Beberapa tabel lokal (mis. `pembelajaran_dosen_ext`) DICURIGAI sebagai **ghost table** (mungkin tidak ada di skema aktual). Pastikan jalur data mana yang hidup sebelum mengikatnya.
> 4. Jangan rusak alur Axios eksisting. Tambahkan lapisan otorisasi lokal di dalam `asyncHandler` SEBELUM `axios.get/post` dipanggil.

---

## FASE 0 — DECISION GATE (WAJIB, output: laporan + pilihan user)

Agent melakukan investigasi berikut, lalu **berhenti dan laporkan** ke user. JANGAN lanjut ke Fase 1 tanpa keputusan user.

### 0.1 Pastikan status `pembelajaran_dosen_ext`
- Cek apakah tabel benar-benar ada di DB aktual (mis. query `information_schema.tables`, atau `\dt`, atau cek migrasi yang pernah dijalankan).
- Cek apakah ada controller yang benar-benar membaca/menulis ke tabel ini secara lokal, ATAU semuanya proxy ke `API_LOCAL_ABSEN` (Laravel).
- **OUTPUT:** "HIDUP & dipakai lokal" / "MATI (data di Laravel)" / "ada tapi tak terpakai".

### 0.2 Petakan identitas user lintas tabel
- Struktur `tb_users`: `user_id` (UUID), `npm`, `nidn`, `role`.
- Struktur `tb_data_pribadi`: apakah ada `nik`/`nip` di sini?
- Telaah `storePembelajaran` di `absensiController`: payload ke SIAK mengirim `nik_dosen` dan `id_lecture` — **dari kolom lokal mana** nilai ini diambil? (ini menentukan otorisasi dosen).

### 0.3 Konfirmasi struktur respons SIAK (sebagian SUDAH dikunci)
Struktur respons `absensiForMhs` SUDAH dikonfirmasi user:
```json
{ "data": [ { "pembelajaran": { "id_matkul": 10, "kelas": 1, "id_dosen": "...", "pertemuan": 1 } } ] }
```
- Cetak satu sample nyata untuk memastikan tidak ada field tambahan yang relevan (mis. semester, status enrollment).
- Konfirmasi tipe: `id_matkul` integer, `kelas` integer/string?

### 0.4 KEPUTUSAN YANG DIMINTA KE USER (akhir Fase 0)
Berdasarkan 0.1, agent menyajikan ke user pilihan desain pengikatan topik→pertemuan:

- **CABANG HIDUP:** `lms_sections.id_pembelajaran` = FK integer → `pembelajaran_dosen_ext.id`. (lihat §3.1-A)
- **CABANG MATI:** `lms_sections` menyimpan tuple natural `(id_matkul, kelas, pertemuan, semester)` sebagai penanda pertemuan, karena tak ada PK lokal. (lihat §3.1-B)

Agent TIDAK memilih sendiri. Tunggu user.

---

## 1. ROLE (dikonfirmasi)
- `tb_users.role` string: `"Admin"`, `"Dosen"`, `"Dosen_Ext"`, `"Mahasiswa"`.
- JWT `id` → `tb_users.user_id` (UUID). Reuse `authMiddleware`, `dosenOnly`, `mhsOnly`.
- ⚠️ Middleware role eksisting hanya cek STRING. Otorisasi per-kelas butuh lapis kedua (§2).

| Role | Hak di modul ini |
|---|---|
| Admin | Kelola seluruh kelas/matkul. |
| Dosen/Dosen_Ext | Kelola konten HANYA kelas yang ia ampu (§2.1). |
| Mahasiswa | Lihat materi kelas yang ia ambil; submit tugas; forum. Tak bisa edit. |

---

## 2. OTORISASI

### 2.1 Dosen "boleh kelola pertemuan ini?"
Bergantung hasil Fase 0:
- **Jika identitas dosen ke SIAK pakai `nik_dosen`/`id_lecture`** (bukan `user_id`): otorisasi dosen harus mencocokkan identitas yang BENAR. Ambil `nik_dosen` dari kolom lokal yang ditemukan di Fase 0.2 (mungkin `tb_data_pribadi.nip` atau `tb_users.nidn`), JANGAN asal `user_id`.
- Verifikasi kepemilikan: dosen ini memang pengampu `(id_matkul, kelas)` yang bersangkutan — sumbernya tergantung cabang Fase 0 (tabel lokal jika HIDUP, atau cek SIAK jika MATI).
- Admin: lewati cek. Buat middleware `lecturerOwnsClass`.
- ⚠️ RISIKO #1: salah kolom identitas dosen = otorisasi bocor/gagal total. Konfirmasi di Fase 0.

### 2.2 Mahasiswa "boleh akses kelas ini?" — HYBRID (cache + fallback SIAK)
Struktur SIAK sudah dikunci (§0.3). Logika cek enrollment:
```
ada elemen di response.data dengan
  el.pembelajaran.id_matkul === id_matkul && el.pembelajaran.kelas === kelas
→ terdaftar
```
Strategi hybrid B+A:
1. **Cek cache lokal** `lms_enrollment_cache` (§3.5). Cocok → IZINKAN (tanpa panggil SIAK).
2. **Fallback live SIAK** (hanya jika cache kosong): panggil `API_LOCAL_ABSEN_AGAIN/absensi` dengan filter `npm` (pola `absensiForMhs`). Terdaftar → IZINKAN + tulis ke cache. Tidak/erro → **TOLAK (default deny)**.
3. **Cron sinkron** (`node-cron` eksisting) mengisi cache per kelas aktif; interval via `.env`.
- Buat middleware `studentEnrolled`. Default DENY jika tak terverifikasi.

---

## 3. MODEL DATA

### 3.1 `lms_sections` — DUA CABANG (pilih sesuai Fase 0)

**3.1-A CABANG HIDUP:**
| kolom | tipe | catatan |
|---|---|---|
| id | UUID PK | |
| id_pembelajaran | integer FK → pembelajaran_dosen_ext.id | pengikat pertemuan |
| title, description, position, is_published, available_from | | |

**3.1-B CABANG MATI (tuple natural):**
| kolom | tipe | catatan |
|---|---|---|
| id | UUID PK | |
| id_matkul | integer | dari SIAK |
| kelas | (sesuai tipe SIAK) | dari SIAK |
| pertemuan | integer | dari SIAK |
| semester | string | semester aktif (sumber dipastikan Fase 0) |
| title, description, position, is_published, available_from | | |
- ⚠️ Tanpa jaminan referensial. Index gabungan (id_matkul, kelas, pertemuan, semester). Beri komentar utang teknis.

### 3.2 `lms_content_items`
id UUID PK · section_id FK · type enum(`page` `ppt` `pdf` `video` `url` `forum` `exam` `assignment`) · title · position · is_published · payload JSONB · timestamps.

### 3.3 `lms_forum_threads`/`lms_forum_posts` — (sama v2)
threads: id, content_item_id, author_id(UUID), title, is_locked, is_pinned, created_at.
posts: id, thread_id, parent_post_id nullable, author_id, body, edited, timestamps.

### 3.4 `lms_assignments`/`lms_assignment_submissions` — (sama v2)
assignments: id, content_item_id, instructions, due_at, allow_late, max_score, submission_type(`file`|`text`|`both`).
submissions: id, assignment_id, student_id, file_path?, text_body?, submitted_at, is_late, score?, feedback?, graded_by, graded_at.

### 3.5 `lms_enrollment_cache`
id, id_mhs(UUID), npm, id_matkul, kelas, semester, source(`cron`|`live_fallback`), synced_at. Index (id_mhs,id_matkul,kelas,semester). Cache, bukan sumber kebenaran.

### 3.6 `lms_exam_links` (placeholder, fase akhir)
id, content_item_id, exam_category(`uts`|`uas`|`quiz`), cbt_exam_id, open_at, close_at, duration_minutes.

---

## 4. KONTRAK API (`/api/lms`)
Lindungi dengan `authMiddleware` + middleware konteks (`lecturerOwnsClass` untuk tulis, `studentEnrolled` untuk baca materi mhs; Admin lewati).

Routing pengikat pertemuan bergantung cabang Fase 0:
- CABANG HIDUP: `/pertemuan/:idPembelajaran/sections`
- CABANG MATI: `/sections?id_matkul=&kelas=&pertemuan=&semester=` (query/komposit)

Selebihnya sama v2:
- Sections CRUD + reorder.
- Items CRUD + reorder; `POST /items/upload` (Multer, whitelist pdf/ppt/pptx, validasi MIME+ukuran).
- Forum: threads & posts.
- Assignment: get/submit/submissions/grade.
- Presensi: `GET /sections/:id/presensi-status` → PROXY ke service Laravel eksisting. JANGAN hitung/buat ulang presensi. Generate token/QR & scan tetap milik endpoint presensi eksisting.
- Exam (fase akhir): get/launch (SSO CBT).
- Keamanan: `express-rate-limit` di submit/forum/exam; default DENY; sanitasi XSS (Page).

---

## 5. TUJUH JENIS TOPIK (ringkas, detail = v2/v1)
1. **Page** `{html}` — TipTap/Quill + DOMPurify (backend & FE).
2. **PPT** `{file_path,file_name,size}` — default download; embed viewer hanya bila file boleh publik.
3. **PDF** `{file_path,file_name,size}` — react-pdf/iframe + download. (`html2pdf.js` eksisting = generate, bukan view.)
4. **Video** `{youtube_url,video_id,title}` — embed youtube-nocookie, lazy-load.
5. **URL** `{url,label,open_in_new_tab}` — validasi http/https, `rel=noopener noreferrer`.
6. **Forum** — config payload, data tabel §3.3. MVP: thread, reply 1-level, edit/hapus milik sendiri, pin/lock dosen.
7. **Ujian** — UTS/UAS/Quiz→CBT (fase akhir). **Tugas→submission lokal** (§3.4). Verifikasi apakah CBT juga tangani Tugas.

---

## 6. FRONTEND (`fe-ucl`)
```
/modules/admin/pembelajaran/lms/     # editor (admin & dosen)
/modules/student/pembelajaran/lms/   # tampilan mahasiswa
/hooks/lms/  · /repo/lms.js          # SWR + Axios
```
SWR+mutate; sweetalert2; route guard `middleware.js`. UX ala SPADA IMK: topik vertikal, item berikon per tipe, tombol "Tambah aktivitas/sumber" per topik. Tampilkan status presensi di header topik (proxy, read-only di LMS).

---

## 7. URUTAN PENGERJAAN
- **Fase 0:** DECISION GATE (di atas). Berhenti, lapor, tunggu pilihan user.
- **Fase 1:** migrasi `lms_sections` (cabang terpilih) + `lms_content_items`; CRUD+reorder; `lecturerOwnsClass`.
- **Fase 2:** `lms_enrollment_cache` + `studentEnrolled` (hybrid) + cron. Uji default-deny.
- **Fase 3:** Page, PDF, Video, URL.
- **Fase 4:** upload + PPT.
- **Fase 5:** Assignment, lalu Forum.
- **Fase 6:** tautan presensi (proxy).
- **Fase 7:** Exam→CBT (akhir).

---

## 8. HARUS DIKLARIFIKASI MANUSIA (agent: BERHENTI & tanya)
1. **Hasil Fase 0.1** — status `pembelajaran_dosen_ext` (HIDUP/MATI) → pilih cabang §3.1.
2. **Hasil Fase 0.2** — kolom lokal sumber `nik_dosen`/`id_lecture` → otorisasi dosen.
3. Sumber "semester aktif".
4. Tipe `kelas` (integer/string) konsisten lintas SIAK & lokal.
5. Editor rich-text (TipTap/Quill).
6. CBT: format `cbt_exam_id` & SSO handshake (fase 7).
7. Apakah CBT menangani "Tugas".

---

## 9. CATATAN KEJUJURAN TEKNIS
- **Ghost table belum dipastikan** = risiko fondasi terbesar. Itu sebabnya §3.1 punya dua cabang. Jangan koding tabel sampai Fase 0 tuntas.
- **CABANG MATI lebih rapuh:** tuple natural tanpa FK = tak ada jaminan referensial; pertemuan "hidup" di Laravel. Jika SIAK ubah skema, LMS bisa yatim. Trade-off tak terhindar bila tabel memang mati.
- **`nik_dosen` vs `user_id` vs `nidn`** = risiko otorisasi dosen. Konfirmasi Fase 0.2.
- **Cache enrollment bisa basi** → ada fallback live; pantau frekuensi fallback.
- **PPT preview**: tak ada solusi native andal+privat; default download.
- **Single-table+JSONB**: korban integritas field payload, disengaja.
- **Presensi milik Laravel**; LMS hanya penaut. Jangan duplikasi logika.
- **Bukan SPADA resmi**; pelaporan ke aggregator Kemdikbud = pekerjaan lain.
