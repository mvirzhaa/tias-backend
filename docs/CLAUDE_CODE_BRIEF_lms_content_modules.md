# Brief Claude Code — Modul Konten LMS (UCL, Fase 2)

> Dokumen rujukan untuk sesi Claude Code di repo **tias-backend** (UCL). Lanjutan dari brief v2 (integrasi SIAK, Task 1–6 **selesai & tervalidasi**). Dijalankan per-task dengan checkpoint; migration **tidak** dijalankan tanpa izin user.

---

## 1. Posisi & tujuan

Fondasi sudah selesai: sync `siak_v2_*`, identity mapping, authz UUID (dosen via `siak_v2_class_lecturers`, mahasiswa via `siak_v2_participants`), IDOR file tertutup, scope prodi tersaring. Fase ini mengisi kelas dengan **konten yang bisa diajar & dikerjakan**: Page, PDF, Video, Forum, Assignment.

**Anchor:** konten menggantung pada **seksi** (`lms_sections`), dan seksi nge-FK ke `siak_v2_classes.kelasKuliahId`. Authz konten **menggunakan ulang** middleware Task 5, dengan `kelasKuliahId` selalu diturunkan **server-side** (konten → seksi → kelas), tidak pernah dari body.

---

## 2. ⚠️ Bukan greenfield — infrastruktur konten SEBAGIAN sudah ada

Audit IDOR (brief v2) mengungkap komponen yang **sudah ada**:
- Tabel `lms_sections` dan `content_item` (relasi item → section → kelas).
- Middleware `classViewContentAccess` (resolve item → section → `kelasKuliahId`, cek UUID, default DENY).
- `serveFile`, `contentItemController`, `getItem`.
- Storage `storage/lms` (env `LMS_STORAGE_DIR`), di luar `public/`.
- Route `GET /lms/files/:id`, `GET /lms/items/:id`.

**Konsekuensi:** beberapa tipe konten mungkin sudah ada sebagian. **Task A0 (audit) WAJIB lebih dulu** untuk memetakan yang ada vs yang kurang. Jangan bangun ulang yang sudah ada; jangan asumsikan kosong.

---

## 3. Prinsip & guardrail (berlaku semua task)

1. **`kelasKuliahId` selalu server-side** — turunkan dari konten/seksi/assignment → kelas. JANGAN percaya `kelasKuliahId`/`sectionId` dari body untuk otorisasi.
2. **Reuse authz Task 5** — `lecturerOwns` (tulis), `studentEnrolled` (baca), admin/scope. Jangan reinvent. Default **DENY**.
3. **FK ke `siak_v2_classes.kelasKuliahId`** (anchor stabil). JANGAN nge-FK ke tabel kelas legacy/lama.
4. **Jangan sentuh tabel fondasi & legacy** — `siak_v2_*` & `siak_user_mappings` hanya dibaca/di-FK; legacy (`m_matakuliah`, dll.) jangan disentuh.
5. **File reuse pola `storage/lms`** — di luar `public/`, key = UUID server-side, `path.basename` cegah traversal; batasi tipe & ukuran; `storage_key` tak boleh diset via JSON.
6. **Sanitasi semua HTML user** (isi Page, post Forum) → cegah XSS (sanitasi server-side).
7. **Otorisasi tingkat-baris untuk data milik mahasiswa** (submission Assignment) — bukan cuma keanggotaan kelas; mahasiswa hanya boleh lihat/ubah submission-nya **sendiri**.
8. **Migration up/down; JANGAN dijalankan tanpa izin user.** STOP di tiap checkpoint, tunjukkan diff.
9. **Audit dulu (A0); detail A1–A5 difinalkan setelahnya.**

---

## 4. Task A0 — AUDIT infrastruktur konten (KERJAKAN DULU, lalu STOP)

Tanpa perubahan kode/DB. Petakan:

1. **Skema konten.** Semua tabel `lms_*` terkait: `lms_sections`, `content_item`/`lms_content_items`, dan tabel tipe-spesifik (page / pdf / file / video / forum / thread / post / assignment / submission). Per tabel: kolom, FK, constraint, soft-delete. **Kritis:** `lms_sections` nge-FK ke `siak_v2_classes.kelasKuliahId` **atau** ke struktur kelas lama? (`classViewContentAccess` menurunkan `kelasKuliahId` dari section — konfirmasi sumber & tipe relasinya.)
2. **Tipe konten.** Kolom `type`/enum di item — tipe apa yang **didefinisikan**; mana **implemented end-to-end** (CRUD + render/serve) vs placeholder.
3. **Route & authz (TERMASUK TULIS).** Enumerasi semua route `/lms/*` konten (items, files, sections, forum, assignment). Tandai mana yang ber-authz (`classViewContentAccess`/`lecturerOwns`/`studentEnrolled`) dan mana yang **tidak** — **khususnya endpoint create/update/delete**. Audit IDOR kemarin **hanya menguji BACA file**; endpoint tulis bisa punya lubang **IDOR-tulis** (mis. non-pengampu membuat/menghapus konten di kelas yang bukan miliknya).
4. **File handling.** Alur upload, `storage_key`, `serveFile`, batas tipe/ukuran yang sudah ada.
5. **Output: peta status** {ADA-lengkap | ADA-tak-lengkap | TIDAK-ADA} untuk: **sections, page, pdf, video, forum, assignment**. Plus **daftar endpoint tulis tanpa authz** (prioritas keamanan).

**STOP.** Kirim peta ke reviewer; task A1–A5 disusun berdasar temuan nyata.

---

## 5. Task A1–A5 — sketsa (detail final setelah A0)

**A1 — Seksi (`lms_sections`).** Pastikan FK ke `siak_v2_classes.kelasKuliahId`. Default jumlah seksi dari `jumlahPertemuan` (endpoint detail `/akademik/kelas-kuliah/{id}` — sudah dikonfirmasi ada di probe brief v2). Urutan (order), soft-delete. Authz: tulis = lecturerOwns/admin, baca = studentEnrolled/lecturerOwns/admin; `kelasKuliahId` dari section sendiri.

**A2 — Page.** Konten HTML/rich-text sebagai item. CRUD. **Sanitasi HTML server-side** (XSS). Authz: tulis = lecturerOwns, baca = studentEnrolled; kelas server-side (item → section → kelas).

**A3 — PDF & Video.** PDF: upload (reuse `storage/lms`), sajikan via jalur `/lms/files/:id` yang sudah IDOR-safe. Video: **keputusan produk** — file upload (storage + batas ukuran) atau embed URL (YouTube/dll.; validasi/sanitasi embed, jangan render mentah). Authz sama.

**A4 — Forum.** Thread + post (tabel baru bila belum ada), FK ke section/kelas. Pagination post. **Keputusan produk:** siapa boleh buat thread (pengampu saja / mahasiswa juga). Authz: baca/post = studentEnrolled/lecturerOwns; moderasi/hapus = lecturerOwns/admin; kelas server-side. Sanitasi isi post.

**A5 — Assignment.** Paling kompleks. `lms_assignments` (FK section/kelas, deadline, skor maks, instruksi) + `lms_submissions` (FK assignment + `siak_mahasiswa_id`, file/teks, submitted_at, skor, feedback). Authz **berlapis**: buat/nilai assignment = lecturerOwns; submit = studentEnrolled **dan hanya submission sendiri**; lihat submission sendiri = mahasiswa ybs; lihat semua submission = pengampu. **Risiko IDOR-baris:** mahasiswa tak boleh akses submission mahasiswa lain (cek kepemilikan `siak_mahasiswa_id`, bukan cuma keanggotaan kelas). File submission reuse `storage/lms`. **Keputusan produk:** teks + file? resubmission? kebijakan telat (deadline)?

---

## 6. Pertanyaan terbuka (audit + keputusan produk)

- (audit) `lms_sections` sudah FK ke `siak_v2_classes`? Tipe konten apa yang sudah implemented?
- (audit) Endpoint tulis konten mana yang belum ber-authz?
- (produk) Forum: mahasiswa boleh buat thread atau hanya membalas?
- (produk) Assignment: submission teks + file? resubmission diizinkan? kebijakan telat?
- (produk) Video: upload atau embed URL?

---

## 7. Urutan kerja

A0 (audit, **STOP**) → review → A1 (seksi) → A2 (page) → A3 (pdf/video) → A4 (forum) → A5 (assignment).

Tiap task: tunjukkan **diff** + **skenario uji authz** (tulis pengampu OK / non-pengampu 403 / baca peserta OK / non-peserta 403; untuk **A5** tambah: akses submission mahasiswa lain → 403). Migration tidak dijalankan tanpa izin.
