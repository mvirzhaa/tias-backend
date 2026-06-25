# SPEC v6 — Modul Pembelajaran (LMS SPADA-style) — UCL UIKA / TIAS

**Status:** Final pasca-pembedahan kode (fakta id & tipe terverifikasi). Cabang §3.1 = **MATI** (terkunci). Tipe kolom kini berbasis bukti kode, bukan asumsi.

**Perubahan dari v5 (semua dari temuan `exportExcel.js`, `Matakuliah.js`, `siak_class.js`):**
- `id_matkul` = INTEGER (dari `m_matakuliah.id`); `kelas` = STRING nama kelas (dari `siak_class.name` CHAR(10)) — BUKAN integer seperti tertulis di v5. DIKOREKSI.
- Pencocokan id lintas sistem: normalisasi eksplisit + `===`. DILARANG pakai `==` (loose equality) di otorisasi.
- Laravel mengembalikan objek `matkul` lengkap (name, credit) → LMS tak perlu JOIN ke `m_matakuliah` untuk display/otorisasi referensi.
- Kunci penautan: default `id_matkul` (INTEGER), dengan opsi pindah ke `kode_matakuliah` (string stabil) bila terbukti Laravel mengembalikannya — lihat §3.0.

> **BATAS SCOPE (penting):** Modul ini = LMS materi + (backlog) setor nilai. DI LUAR scope & dikerjakan tim/lapisan lain: manajemen user (sumber: SIAK + portal), registrasi, multi-role, scoping akses per-prodi, migrasi data SIAK, struktur organisasi (rektorat/biro/unit). Jangan bangun ini; konsumsi bila sudah tersedia.

> ⚠️ **UNTUK AGENT (CLAUDE CODE):**
> 1. Fase 0 SUDAH SELESAI — jangan ulangi investigasi gate. Mulai dari Fase 1.
> 2. BERHENTI & tanya user bila nama kolom/perilaku tidak cocok kondisi riil. Jangan menebak.
> 3. Jangan rusak alur Axios/proxy Laravel eksisting. Tambahkan lapisan otorisasi lokal di `asyncHandler` SEBELUM panggil Laravel.
> 4. Default DENY pada semua otorisasi.

---

## 0. HASIL & KEPUTUSAN FASE 0 (terkunci, jangan ubah)

1. **Dua jalur "pembelajaran" di kode.** PROXY (`controllers/absensi/*` → Laravel `fts-absen`) = sumber kebenaran pertemuan yang NYATA-JALAN di produksi. LOKAL (`pembelajaran_dosen_ext` + `absensi_external/*`) = tabel KHUSUS dosen pengganti/eksternal, migrasi belum jalan.
2. **`pembelajaran_dosen_ext` DI LUAR SCOPE LMS.** Itu suplemen untuk kasus presensi dengan dosen pengganti. Modul LMS TIDAK menyentuhnya, TIDAK meng-FK ke sana.
3. **Sumber kebenaran pertemuan = Laravel `fts-absen`** (tidak ada rencana pindah ke lokal). → **CABANG MATI.**
4. **Laravel LABIL** ("kadang bermasalah tapi dipakai terus"). → Caching lokal naik status jadi **WAJIB** (pertahanan, bukan optimasi). Semua akses Laravel butuh fallback/cache.
5. **Identitas dosen (PENTING — jangan tertukar):**
   - `nik_dosen` = `tb_data_pribadi.nip` (string), via `req.user.nip`. → untuk komunikasi ke Laravel/SIAK & pencocokan kelas.
   - `id_lecture` = `tb_users.user_id` (UUID), via `req.user.user_id`. → identitas dosen internal UCL, penanda kepemilikan konten LMS. **Diturunkan SERVER-SIDE dari JWT, JANGAN dari req.body.**
6. **Otorisasi materi:** HANYA dosen pengampu utama matkul. Dosen pengganti TIDAK relevan untuk materi LMS.
7. **Temuan keamanan (di luar scope, JANGAN diperbaiki diam-diam):** `storePembelajaran` (`controllers/absensi/pembelajaranController.js`) mengambil `nik_dosen`/`id_lecture` dari `req.body` tanpa verifikasi server = lubang otorisasi. Ini bug presensi EKSISTING. Laporkan ke user untuk diputuskan terpisah; jangan ubah sebagai bagian modul LMS.
8. **Semester aktif:** SIAK TIDAK menyediakan (terkonfirmasi). → pakai **kolom config DB** (diubah admin tiap pergantian semester, tanpa redeploy). Tentukan nama tabel config saat Fase 1.
9. **DB lokal pengembangan adalah stub** (hanya 3 tabel: SequelizeMeta, tb_users, cbt_user_mappings). Jangan asumsikan tabel lain ada; verifikasi via `information_schema` sebelum bergantung padanya.

---

## 1. IDENTITAS & ROLE

`tb_users` (live, terverifikasi Fase 0): `user_id`(uuid), `nidn`, `npm`, `role`, `curr_code`, `department_code`. TIDAK ada `nip` di sini.
`tb_data_pribadi` (punya `nik` & `nip`) di-LEFT JOIN oleh `authMiddleware.protected` → tersedia di `req.user.nip`.

Role string: `"Admin"`, `"Dosen"`, `"Dosen_Ext"`, `"Mahasiswa"`.

| Role | Hak |
|---|---|
| Admin | Seluruh kelas/matkul. |
| Dosen/Dosen_Ext | Kelola konten HANYA kelas yang ia ampu sebagai pengampu utama (§2.1). |
| Mahasiswa | Lihat materi kelas yang diambil; submit tugas; forum. Tak bisa edit. |

---

## 2. OTORISASI (inti keamanan)

### 2.1 Dosen "pengampu utama kelas ini?" — `lecturerOwnsClass`
- Identitas konten: simpan `id_lecture` = `req.user.user_id` (UUID) saat dosen membuat section/konten.
- Verifikasi kepemilikan kelas: cek apakah dosen (`req.user.nip` sebagai `nik_dosen`) memang mengampu `(id_matkul, kelas, semester)` — sumbernya Laravel (via cache `lms_class_cache`, §3.6, dengan fallback live).
- Admin: lewati cek.
- ⚠️ JANGAN ambil identitas dosen dari req.body. Selalu dari `req.user` (JWT terverifikasi).

### 2.1b KETERGANTUNGAN pada RBAC scoping-prodi (DI LUAR scope, JANGAN dibangun) 🔄
- Rapat 8 Jun: scoping per-prodi (dosen TI hanya boleh akses matkul prodi TI; mahasiswa TI hanya matkul TI) ditangani **lapisan RBAC terpisah oleh tim lain**, bukan modul LMS.
- ⚠️ TAPI LMS BERGANTUNG padanya. `lecturerOwnsClass`/`studentEnrolled` berasumsi user yang sampai ke endpoint LMS SUDAH tersaring prodinya oleh lapisan itu.
- Selama lapisan RBAC-prodi BELUM ada, otorisasi LMS berpotensi bocor di level prodi (dosen TI bisa akses matkul prodi lain bila tahu parameternya).
- TINDAKAN agent: JANGAN bangun scoping prodi. Tapi (1) sediakan titik kait/hook yang jelas tempat lapisan prodi akan menyambung; (2) jika info prodi user (`tb_users.department_code`/`curr_code`) tersedia, terapkan default-DENY bila matkul di luar prodi user — sebagai pengaman sementara; (3) beri komentar TODO menandai sambungan ke RBAC-prodi. Konfirmasi ke user sebelum mengandalkan `department_code`/`curr_code`.

### 2.2 Mahasiswa "terdaftar di kelas ini?" — `studentEnrolled` (HYBRID, WAJIB cache)
Struktur respons Laravel (terverifikasi dari `exportExcel.js`/`absensiForMhs`):
```
data[] = {
  name_mhs, npm, persentase,
  status_absen: [1,0,2,1,null,...],   // per pertemuan: 1=Hadir 0=Alpha 2=Sakit/Izin null=belum (⚠️ pemetaan dari pembacaan kode, KONFIRMASI ke tim Laravel sebelum dipakai utk NILAI)
  pembelajaran: { id_matkul, kelas },  // + objek matkul:{name,credit} di endpoint rekap
}
```
Cek terdaftar: ada elemen yang `pembelajaran.id_matkul` & `pembelajaran.kelas` cocok dengan kelas yang diminta.
- ⚠️ Pencocokan WAJIB ikut §3.0b: `String(a).trim()===String(b).trim()`. `kelas` adalah STRING; `id_matkul` integer-as-string. JANGAN tiru bug eksisting `absensiForMhs.js:174` (banding mentah string-vs-int).
1. Cek cache `lms_enrollment_cache` → cocok = IZINKAN.
2. Fallback live SIAK (`API_LOCAL_ABSEN_AGAIN`, filter `npm`) hanya bila cache kosong → terdaftar = IZINKAN + tulis cache; tolak/error = DENY.
3. Cron sinkron isi cache. Default DENY.

### 2.3 Resolusi pertemuan — `resolvePertemuan()` (BARU, krusial krn Laravel labil)
- SATU-SATUNYA lapisan yang tahu "cara menemukan pertemuan". Semua kode lain memanggil ini, JANGAN sebar tuple `(id_matkul,kelas,pertemuan,semester)` ke mana-mana.
- Hari ini: resolve via cache `lms_class_cache` (§3.6) → fallback Laravel bila cache miss.
- Alasan abstraksi: jika kelak UIKA pindah sumber pertemuan, cukup ganti isi fungsi ini, bukan seluruh modul.
- Saat Laravel down DAN cache miss: kembalikan error jelas ("data pertemuan sementara tak tersedia"), jangan gantung/crash.

---

## 3. MODEL DATA

### 3.0 KUNCI PENAUTAN matkul (keputusan terkonfigurasi) 🔄
- **Default: `id_matkul` (INTEGER).** Sesuai `m_matakuliah.id` (INTEGER autoIncrement) dan id yang dikembalikan Laravel (terbukti nyambung via `exportExcel.js` di produksi).
- **Opsi lebih baik bila terbukti tersedia: `kode_matakuliah` (STRING, mis. "IF101").** Lebih stabil daripada id auto-increment (tahan resync). ⚠️ HANYA pakai ini jika dikonfirmasi respons Laravel menyertakan `kode_matakuliah`/`matkul.kode`. Bila ya, ganti kunci penautan ke kode, dan beri tahu user. Bila tidak terlihat → tetap `id_matkul`.
- Agent: cek apakah objek `matkul` di respons Laravel memuat field kode; laporkan, jangan asumsikan.

### 3.0b ATURAN PENCOCOKAN ID (WAJIB — keamanan otorisasi)
- `m_matakuliah.id` = INTEGER; respons Laravel diperlakukan sebagai STRING (terbukti `===` dgn query param string jalan). Keduanya hanya konsisten bila dinormalkan.
- ATURAN: normalisasi KEDUA sisi secara eksplisit lalu banding ketat: `String(a).trim() === String(b).trim()`.
- DILARANG `==` (loose equality) di jalur otorisasi/enrollment — koersi JS (`0==''`, `0==false`) membuka fail-open. Kontrol konversi secara sadar, jangan serahkan ke mesin.
- Lakukan normalisasi di SATU titik (`resolvePertemuan()` / util pencocokan), bukan tersebar.

### 3.1 `lms_sections` — CABANG MATI (terkunci)
| kolom | tipe | catatan |
|---|---|---|
| id | UUID PK | |
| id_matkul | INTEGER | penanda matkul (= `m_matakuliah.id`, juga dikembalikan Laravel). Lihat §3.0 bila pindah ke kode. |
| kelas | STRING | 🔄 nama kelas ("A","TI-1A"), dari `siak_class.name` CHAR(10) & respons Laravel. BUKAN integer. |
| pertemuan | INTEGER | 1..N |
| semester | STRING | dari kolom config DB (SIAK tak menyediakan — §0.8 dikoreksi) |
| id_lecture | UUID | = user_id dosen pembuat (kepemilikan konten UCL) |
| title, description, position, is_published, available_from | | |
| created_at/updated_at | | |
- Index gabungan (id_matkul, kelas, pertemuan, semester). Catatan: `kelas` string → index tetap valid.
- ⚠️ Tanpa FK ke pertemuan (pertemuan hidup di Laravel). Utang teknis: materi bisa "yatim" bila Laravel renumber (risiko rendah operasi normal). Mitigasi: semua resolusi lewat `resolvePertemuan()`.
- ⚠️ Pencocokan id_matkul/kelas dgn respons Laravel WAJIB ikut §3.0b.

### 3.2 `lms_content_items`
id UUID PK · section_id FK · type enum(`page` `ppt` `pdf` `video` `url` `forum` `exam` `assignment`) · title · position · is_published · payload JSONB · timestamps.

### 3.3 `lms_forum_threads`/`lms_forum_posts` (sama v3)
### 3.4 `lms_assignments`/`lms_assignment_submissions` (sama v3)

### 3.5 `lms_enrollment_cache` (WAJIB — penyangga ketersediaan saat Laravel down, BUKAN sumber kebenaran KRS)
id, id_mhs(uuid), npm(string), id_matkul(INTEGER), kelas(STRING), semester(string), source(`cron`|`live_fallback`), synced_at. Index (id_mhs,id_matkul,kelas,semester). Catatan: data referensi (nama matkul/SKS) TIDAK diduplikasi di sini — itu datang dari Laravel; cache ini hanya untuk menjawab "boleh akses?" saat Laravel tak terjangkau.

### 3.6 `lms_class_cache` (penopang `resolvePertemuan` & otorisasi dosen)
id, id_matkul(INTEGER), kelas(STRING), semester, nik_dosen_pengampu(string=nip), daftar_pertemuan(JSONB), synced_at. Diisi cron dari Laravel. Penopang saat Laravel down.

### 3.7 `lms_exam_links` (placeholder, fase akhir)
id, content_item_id FK, exam_category(`uts`|`uas`|`quiz`), cbt_exam_id, open_at, close_at, duration_minutes.

---

## 4. KONTRAK API (`/api/lms`)
`authMiddleware` + `lecturerOwnsClass` (tulis) / `studentEnrolled` (baca materi mhs); Admin lewati.

Pengikat pertemuan via query/komposit (CABANG MATI):
- `GET/POST /sections?id_matkul=&kelas=&pertemuan=&semester=`
- `PUT/DELETE /sections/:id` · `PATCH /sections/reorder`
- Items CRUD + reorder; `POST /items/upload` (Multer, whitelist pdf/ppt/pptx, validasi MIME+ukuran).
- Forum: threads & posts. Assignment: get/submit/submissions/grade.
- Presensi: `GET /sections/:id/presensi-status` → PROXY ke Laravel eksisting (read-only di LMS). Generate token/QR & scan tetap milik endpoint presensi eksisting.
- Exam (fase akhir): get/launch (SSO CBT).
- Keamanan: `express-rate-limit` di submit/forum/exam; default DENY; sanitasi XSS (Page).

---

## 5. TUJUH JENIS TOPIK (detail = v1/v2)
1. **Page** `{html}` — TipTap/Quill + DOMPurify (BE & FE).
2. **PPT** `{file_path,file_name,size}` — default download; embed viewer hanya bila file boleh publik.
3. **PDF** `{file_path,file_name,size}` — react-pdf/iframe + download.
4. **Video** `{youtube_url,video_id,title}` — embed youtube-nocookie, lazy-load.
5. **URL** `{url,label,open_in_new_tab}` — validasi http/https, rel=noopener.
6. **Forum** — config payload, data tabel §3.3. MVP: thread, reply 1-level, edit/hapus milik sendiri, pin/lock dosen.
7. **Ujian** — UTS/UAS/Quiz→CBT (fase akhir). Tugas→submission lokal (§3.4). Verifikasi apakah CBT tangani Tugas.

---

## 6. FRONTEND (`fe-ucl`)
```
/modules/admin/pembelajaran/lms/    · /modules/student/pembelajaran/lms/
/hooks/lms/ · /repo/lms.js          (SWR + Axios)
```
SWR+mutate; sweetalert2; route guard `middleware.js`. UX ala SPADA IMK: topik vertikal, item berikon per tipe, tombol "Tambah aktivitas/sumber" per topik. Status presensi di header topik (proxy, read-only).

---

## 7. URUTAN PENGERJAAN
- **Fase 1:** migrasi `lms_sections` (CABANG MATI) + `lms_content_items`; CRUD+reorder; `lecturerOwnsClass` (pakai id_lecture=user_id + verifikasi nip via cache kelas). **Jalankan migrasi & uji.**
- **Fase 2:** `lms_enrollment_cache` + `lms_class_cache` + `resolvePertemuan` + `studentEnrolled` (hybrid) + cron sinkron. **Uji default-deny & perilaku saat Laravel down (simulasikan).**
- **Fase 3:** Page, PDF, Video, URL.
- **Fase 4:** upload + PPT.
- **Fase 5:** Assignment, lalu Forum.
- **Fase 6:** tautan presensi (proxy read-only).
- **Fase 7:** Exam→CBT (akhir; butuh koordinasi tim CBT).
- **Fase 8 (BACKLOG — setor nilai ke SIAK):** akumulasi nilai (tugas + kehadiran + ujian) → setor ke SIAK. ⚠️ Belum bisa dikerjakan sebelum: (a) CBT jadi (sumber nilai ujian), (b) format nilai yang SIAK harapkan jelas, (c) mekanisme jelas — kemungkinan SIAK PULL dari endpoint UCL (rapat: "SIAK menarik nilai dari UCL", "periodik atau real-time"). Angka final/skala tetap diatur SIAK (kebijakan kampus bisa ubah nilai). BERHENTI & koordinasi tim SIAK sebelum mulai.

---

## 8. MASIH PERLU KLARIFIKASI (agent: BERHENTI & tanya bila tersentuh)
1. ✅ SEMESTER: SIAK tak menyediakan → pakai kolom config DB (terjawab). Tinggal tentukan nama tabel config.
2. Endpoint Laravel untuk menarik DAFTAR PERTEMUAN & pengampu per kelas (pengisi `lms_class_cache`) — mana yang dipakai? (endpoint rekap di `exportExcel.js` mengembalikan matkul+pertemuan; verifikasi apakah bisa dipakai ulang).
   - ⚠️ **TEMUAN Fase 1 (bedah §8.2-semantik):** `lecturerOwnsClass` SEMENTARA memakai `GET {API_LOCAL_ABSEN_AGAIN}/pembelajaran` filter `nik_dosen` (pola produksi `dashboardController:111`/`exportExcel.js:16`, respons FLAT: `id_matkul`,`kelas`,`nik_dosen` top-level). **TAPI endpoint itu terbukti hanya memuat pertemuan-yang-SUDAH-dibuat** → dosen yang belum membuat pertemuan pertama akan **tertolak 403** saat menyiapkan materi. **Kandidat pengganti: `/dosen-mk` (jadwal mengajar)** — menunggu verifikasi format. **JANGAN anggap otorisasi `lecturerOwnsClass` FINAL sampai endpoint dikonfirmasi & diuji dengan data nyata di Fase 2.**
3. Apakah respons Laravel menyertakan `kode_matakuliah` (untuk opsi kunci penautan §3.0)?
4. ✅ Status presensi: array `status_absen` per pertemuan (terjawab) — TAPI pemetaan angka→makna perlu konfirmasi tim Laravel sebelum dipakai untuk NILAI.
5. Editor rich-text (TipTap/Quill).
6. CBT: format `cbt_exam_id` & SSO handshake (fase 7); apakah CBT tangani "Tugas".

---

## 9. CATATAN KEJUJURAN TEKNIS
- **Laravel suplai objek matkul lengkap** (name, credit) di respons → LMS TIDAK perlu JOIN ke `m_matakuliah` untuk display/otorisasi referensi. Tapi cache (§3.5/§3.6) tetap WAJIB sebagai penyangga saat Laravel down — cache TIDAK menduplikasi data referensi, hanya menjawab "boleh akses?".
- **Tipe data adalah jebakan:** `id_matkul` INTEGER di DB lokal vs string di respons Laravel; `kelas` STRING. Pencocokan WAJIB normalisasi eksplisit (§3.0b). `==` DILARANG di otorisasi.
- **CABANG MATI = utang sadar:** tuple tanpa FK, materi bisa yatim bila Laravel renumber (risiko rendah operasi normal). Mitigasi via `resolvePertemuan()`.
- **Laravel labil = risiko ketersediaan utama.** Caching (§3.5, §3.6) WAJIB, bukan opsional. Uji jalur "Laravel down" secara eksplisit.
- **Dua identitas dosen** (`nip` utk Laravel, `user_id` utk kepemilikan LMS) — jangan tertukar; itu memecah otorisasi.
- **`lecturerOwnsClass` BELUM FINAL (endpoint pending).** Implementasi Fase 1 memakai `/pembelajaran` (filter `nik_dosen`), namun endpoint itu hanya memuat pertemuan-yang-sudah-dibuat → dosen tertolak 403 sebelum membuat pertemuan pertama (false-deny). Perlu ganti ke endpoint jadwal mengajar (kandidat `/dosen-mk`) + uji data nyata di Fase 2. Sampai itu, otorisasi dosen LMS dianggap sementara. Lihat §8.2.
- **Lubang otorisasi storePembelajaran** ada di kode eksisting; di luar scope LMS; laporkan, jangan tambal diam-diam.
- **Presensi & pembelajaran_dosen_ext** milik domain presensi; LMS hanya konsumen read-only.
- **Bukan SPADA resmi**; pelaporan aggregator Kemdikbud = pekerjaan lain.

---

## 10. BACKLOG & BATAS SCOPE (hasil rapat 8 Jun — JANGAN dikerjakan di modul ini) 🔄
Dicatat agar tidak hilang, tapi BUKAN tanggung jawab modul LMS ini:
- **Manajemen user & registrasi:** user (mahasiswa/dosen/pegawai) bersumber dari SIAK; registrasi via portal/reportal. UCL TIDAK membuat/menduplikasi data user. Hanya yang terdaftar di SIAK bisa login. → tim lain.
- **Multi-role:** satu user beberapa peran (mis. dosen + kepala biro). → tim lain.
- **Scoping per-prodi:** lihat §2.1b. LMS hanya bergantung, tidak membangun. → tim lain (lapisan RBAC).
- **Migrasi data SIAK lama → baru:** tarik kurikulum/jadwal sebelum cutoff; akses DB lama via koordinasi tim IT. → tim lain.
- **Struktur organisasi** (rektorat/lembaga/biro/unit) untuk RBAC: → tim lain.
- **Identitas user lintas sistem:** dosen=NIDN/NID, pegawai=NID, mahasiswa=NPM; registrasi pakai NIP/NPM. LMS mencocokkan, tidak menduplikasi.

**Yang MASUK scope LMS tapi backlog (kerjakan setelah inti):** Setor nilai ke SIAK (Fase 8).

**Konfirmasi dari rapat (sejalan v4/v5, tidak berubah):** presensi tetap engine terpisah (LMS read-only konsumen); UCL fokus provide materi + tugas akhir; sumber kebenaran pertemuan = SIAK/Laravel.

**Target waktu (konteks, bukan instruksi teknis):** inti LMS diharapkan jalan pertengahan Juli; dipakai PJJ September. Implikasi: prioritaskan inti (Fase 1–6), jangan melebar ke item §10 yang bukan scope.
