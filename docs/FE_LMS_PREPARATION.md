# Persiapan Frontend LMS UCL

## Kondisi Saat Ini

Repo frontend ada di sibling folder:

- `D:\Belajar\fe-ucl`

Struktur yang sudah tersedia:

- Next.js dengan halaman role-based: `admin`, `dosen`, `mahasiswa`, `dosen_ext`.
- Menu aktif memakai `src/config/MenuUpdate.js` melalui `src/utils/menu.js`.
- Repo API LMS sudah ada di `src/repo/lms.js`.
- Modul detail LMS sudah ada di `src/modules/pembelajaran/lms`.
- Halaman detail kelas sudah ada:
  - `src/pages/dosen/pembelajaran/[kelasKuliahId].jsx`
  - `src/pages/mahasiswa/pembelajaran/[kelasKuliahId].jsx`

Yang belum ada:

- Halaman daftar kelas LMS sebagai pintu masuk.
- Halaman LMS untuk `dosen_ext`.
- Halaman detail LMS untuk admin.
- UI admin untuk sync SIAK, validasi, mapping matakuliah, dan role scope LMS.

## Penekanan Produk: SPADA-style

LMS yang sedang dibuat harus dipahami sebagai **LMS dengan alur seperti SPADA Kemendik**, bukan sekadar halaman upload materi.

Artinya, pengalaman utama user harus berbentuk:

1. Mahasiswa/dosen memilih **kelas kuliah**.
2. Masuk ke **ruang belajar kelas**.
3. Konten disusun per **topik/pertemuan/minggu** secara vertikal.
4. Setiap topik berisi **aktivitas atau sumber belajar** seperti page, PDF, PPT, video, URL, forum, assignment, dan nanti exam/quiz.
5. Dosen mengelola isi kelas, mahasiswa membaca/mengerjakan, admin memantau sesuai scope.

Jadi fokus FE bukan hanya CRUD data. FE harus terasa seperti ruang pembelajaran:

- Ada daftar kelas yang jelas sebagai pintu masuk.
- Di dalam kelas ada header informasi matakuliah, kelas, dosen, semester, prodi/fakultas.
- Materi ditampilkan dalam blok topik/pertemuan.
- Item materi punya ikon/tipe yang mudah dikenali.
- Dosen punya tombol tambah topik dan tambah aktivitas.
- Mahasiswa hanya melihat materi yang dipublish.
- Forum dan assignment diperlakukan sebagai aktivitas belajar, bukan menu terpisah yang lepas dari kelas.

Catatan batasan: ini **SPADA-style untuk UCL**, bukan klaim sebagai SPADA resmi dan bukan otomatis integrasi pelaporan Kemdikbud. Integrasi resmi/pelaporan eksternal harus diperlakukan sebagai pekerjaan terpisah bila nanti diminta.

## Prioritas FE

### Tahap 1 - Daftar Kelas LMS

Buat halaman daftar kelas agar user bisa masuk ke detail LMS.

Endpoint backend:

```http
GET /lms/classes?semester=20241&search=&page=1&limit=10
```

Halaman yang disarankan:

- `src/pages/dosen/pembelajaran/index.jsx`
- `src/pages/dosen_ext/pembelajaran/index.jsx`
- `src/pages/mahasiswa/pembelajaran/index.jsx`
- `src/pages/admin/pembelajaran/[kelasKuliahId].jsx`

Komponen reusable:

- `src/modules/pembelajaran/lms/ClassList.jsx`

Perilaku:

- Dosen melihat kelas yang dia ampu.
- Dosen external melihat kelas yang dia ampu.
- Mahasiswa melihat kelas yang dia ambil.
- Admin LMS melihat kelas sesuai scope backend.
- Admin biasa/univ dapat melihat semua kelas yang diizinkan backend.

Catatan penting: filtering tetap wajib dari backend. FE hanya untuk UX.

### Tahap 2 - Menu Pembelajaran

Ubah `src/config/MenuUpdate.js`.

Menu `Pembelajaran` sebaiknya bisa diakses oleh:

- `Admin`
- `Dosen`
- `Dosen_Ext`
- `Mahasiswa`

Submenu yang disarankan:

- `Kelas LMS` untuk semua role di atas.
- `Matakuliah` untuk admin.
- `Kurikulum` untuk admin.
- `Sync SIAK` untuk admin.
- `Mapping SIAK` untuk admin.
- `Role LMS` untuk admin.

Untuk dosen/mahasiswa, URL menu akan otomatis diberi prefix:

- `/dosen/pembelajaran`
- `/dosen_ext/pembelajaran`
- `/mahasiswa/pembelajaran`

Untuk admin:

- `/admin/pembelajaran`

### Tahap 3 - Admin Sync SIAK

Tambahkan tab/section di halaman admin pembelajaran:

- Status staging SIAK
- Tombol sync semua resource
- Tombol sync per resource
- Hasil validasi cutover
- Daftar warning/error

Endpoint backend:

```http
GET /siak-sync/resources
POST /siak-sync/sync
POST /siak-sync/sync/:resource
GET /siak-sync/validation
POST /lms/sync-siak
```

Alur UI:

1. Admin klik sync SIAK.
2. Admin cek validasi.
3. Jika valid, admin klik sync ke LMS.
4. Halaman daftar kelas LMS menampilkan data terbaru dari staging.

### Tahap 4 - Mapping Matakuliah

Tambahkan tab mapping di admin pembelajaran.

Endpoint backend:

```http
GET /siak-sync/course-mappings
POST /siak-sync/course-mappings/auto
POST /siak-sync/course-mappings
PATCH /siak-sync/course-mappings/:id
DELETE /siak-sync/course-mappings/:id
```

Perilaku:

- Tampilkan matkul lokal vs matkul SIAK.
- Status mapping: `pending`, `verified`, `rejected`.
- Tombol auto-map.
- Admin bisa verifikasi mapping yang cocok.
- Mapping dengan beda SKS harus review manual.

### Tahap 5 - Role Scope LMS

Tambahkan tab role scope di admin pembelajaran.

Endpoint backend:

```http
GET /lms/role-scopes/me
GET /lms/role-scopes
POST /lms/role-scopes
PATCH /lms/role-scopes/:id
DELETE /lms/role-scopes/:id
```

Scope yang disiapkan backend:

- `lms_admin_univ`
- `lms_admin_fakultas`
- `lms_admin_prodi`

Field penting:

- `user_id`
- `role_key`
- `scope_type`
- `fakultas_id`
- `prodi_id`
- `is_active`

## Urutan Implementasi Disarankan

1. Tambah API helper di `src/repo/lms.js`.
2. Buat `ClassList.jsx`.
3. Buat halaman index pembelajaran untuk dosen, dosen_ext, dan mahasiswa.
4. Tambah route detail admin LMS.
5. Update `MenuUpdate.js`.
6. Tambah tab admin sync SIAK.
7. Tambah tab mapping.
8. Tambah tab role scope.

Tahap pertama yang paling penting adalah daftar kelas LMS, karena modul detail kelas sebenarnya sudah ada tetapi belum punya pintu masuk yang rapi.
