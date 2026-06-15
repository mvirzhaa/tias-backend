# Persiapan Sync SIAK Baru di UCL

Dokumen ini adalah checklist kerja bertahap agar UCL siap menerima endpoint SIAK baru.

## 1. File yang Sudah Disiapkan

| File | Fungsi |
| --- | --- |
| `docs/KONTRAK_API_SIAK_BARU.md` | Kontrak field minimum dan format pagination |
| `docs/mock-siak/*.json` | Contoh response paginated dari SIAK baru |
| `docs/STRUKTUR_DATABASE_SISTEM_BERJALAN.md` | Peta database berjalan |
| `docs/STRUKTUR_DATABASE_UCL_SIAK_LMS.md` | Rancangan target integrasi SIAK baru/LMS |

## 2. Env yang Perlu Disiapkan

Belum perlu diisi sebelum endpoint SIAK tersedia. Untuk development, gunakan mode mock.

```env
SIAK_SYNC_MODE=mock
SIAK_V2_BASE_URL=
SIAK_V2_TOKEN=
SIAK_SYNC_PER_PAGE=500
SIAK_SYNC_SEMESTER=20241
```

Saat endpoint asli siap:

```env
SIAK_SYNC_MODE=api
SIAK_V2_BASE_URL=https://domain-siak-baru.example/api
SIAK_V2_TOKEN=token-service-account
SIAK_SYNC_PER_PAGE=500
SIAK_SYNC_SEMESTER=20241
```

## 3. Tahapan Implementasi UCL

### Tahap 1 - Kontrak dan mock

Status: siap.

Output:

- Kontrak API paginated.
- Mock JSON untuk semua resource utama.
- Contoh peserta kelas dibuat 2 page agar pagination bisa dites.

### Tahap 2 - Tabel staging/sync

Status: migration dan model Sequelize sudah disiapkan serta sudah berhasil dijalankan ke database development.

Buat tabel penampung hasil SIAK baru, jangan langsung timpa `m_matakuliah`.

Tabel yang disarankan:

```text
siak_sync_faculties
siak_sync_study_programs
siak_sync_curriculums
siak_sync_courses
siak_sync_classes
siak_sync_class_lecturers
siak_sync_class_schedules
siak_sync_class_participants
siak_sync_runs
matakuliah_siak_mapping
```

### Tahap 3 - Sync service pagination

Status: service, controller, dan route admin sudah disiapkan. Mode mock sudah dites berhasil.

Service harus bisa:

- Membaca dari mock file saat `SIAK_SYNC_MODE=mock`.
- Hit API asli saat `SIAK_SYNC_MODE=api`.
- Mengambil page sampai selesai.
- Upsert data ke tabel staging.
- Mencatat hasil sync ke `siak_sync_runs`.
- Mengembalikan error yang jelas jika ada page gagal.

Endpoint lokal:

```text
GET  /siak-sync/resources
GET  /siak-sync/validation
GET  /siak-sync/course-mappings
POST /siak-sync/course-mappings/auto
POST /siak-sync/course-mappings
PATCH /siak-sync/course-mappings/:id
DELETE /siak-sync/course-mappings/:id
POST /siak-sync/sync
POST /siak-sync/sync/:resource
```

Endpoint role scope LMS:

```text
GET    /lms/role-scopes/me
GET    /lms/role-scopes
POST   /lms/role-scopes
PATCH  /lms/role-scopes/:id
DELETE /lms/role-scopes/:id
```

Endpoint LMS:

```text
GET  /lms/classes
POST /lms/sync-siak
```

Endpoint `/siak-sync/*`, `/lms/sync-siak`, dan pengelolaan `/lms/role-scopes`
memakai `protected + adminOnly`. Endpoint `/lms/classes` dan `/lms/role-scopes/me`
memakai `protected` lalu difilter berdasarkan role/scope user.

Hasil test mock:

```text
faculties: 1 row, 1 page
study-programs: 2 row, 1 page
curriculums: 2 row, 1 page
courses: 2 row, 1 page
classes: 2 row, 1 page
class-lecturers: 2 row, 1 page
class-schedules: 2 row, 1 page
class-participants: 3 row, 2 page
```

Repeat-sync juga sudah dites aman. Row staging tidak dobel karena upsert memakai natural key
per resource, sedangkan `siak_sync_runs` tetap bertambah sebagai audit log setiap proses sync.

Contoh resource:

```text
faculties
study-programs
curriculums
courses
classes
class-lecturers
class-schedules
class-participants
```

### Tahap 4 - Validator hasil sync

Status: service dan endpoint admin sudah disiapkan. Test mock terakhir menghasilkan `valid: true`
dengan `total_errors: 0` dan `total_warnings: 2`.

Warning saat ini:

```text
1 mata kuliah SIAK belum termapping: TIF152 - Basis Data
1 mapping belum diverifikasi: TIF221 - Pemrograman Berorientasi Obyek
```

Validasi setelah sync:

```text
sync terakhir tiap resource belum sukses
prodi tanpa fakultas
kurikulum tanpa prodi
courses tanpa prodi
courses tanpa kurikulum
classes tanpa course
classes tanpa prodi
class_lecturers tanpa class
class_schedules tanpa class
class_participants tanpa class
participant tanpa npm
lecturer tanpa nip
duplikasi class + npm
duplikasi class + nip
duplikasi slot jadwal
mapping ke m_matakuliah yang tidak ada
mapping ke mata kuliah SIAK yang tidak ada
mata kuliah SIAK baru yang belum termapping ke m_matakuliah
```

Endpoint:

```text
GET /siak-sync/validation?limit=50
```

Response membedakan `errors` dan `warnings`:

```text
valid = total_errors == 0
ready_for_cutover = total_errors == 0 && total_warnings == 0
```

### Tahap 5 - Integrasi bertahap

Status persiapan mapping: service dan endpoint admin sudah disiapkan.

Mapping mata kuliah:

```text
GET    /siak-sync/course-mappings?limit=25&page=1&status=pending&search=TIF
POST   /siak-sync/course-mappings/auto
POST   /siak-sync/course-mappings
PATCH  /siak-sync/course-mappings/:id
DELETE /siak-sync/course-mappings/:id
```

Aturan auto-map:

```text
1. Kode mata kuliah lokal dan SIAK harus match persis setelah trim + uppercase.
2. Kode tersebut harus unik di masing-masing sumber.
3. SKS harus sama, kecuali salah satu sumber belum mengirim SKS.
4. Hasil auto-map masuk status pending, tetap perlu verifikasi admin.
```

Hasil test mock:

```text
TIF221 -> auto mapped, status pending
TIF152 -> perlu review manual karena SKS lokal 2, SKS SIAK 3
```

Urutan aman:

```text
1. Admin/report akademik baca dari staging SIAK baru
2. LMS baca dari kelas SIAK baru
3. Absensi tetap pakai m_matakuliah dulu
4. Buat mapping m_matakuliah ke mataKuliahId
5. Setelah mapping stabil, absensi bisa dimigrasikan bertahap
```

### Tahap 6 - Role dan scope LMS

Status: tabel, model, service, controller, route, dan middleware baca LMS sudah disiapkan.

Tabel:

```text
lms_role_scopes
```

Role scope yang disiapkan:

```text
lms_admin_univ     -> scope university
lms_admin_fakultas -> scope faculty, wajib fakultas_id
lms_admin_prodi    -> scope study_program, wajib prodi_id
```

Aturan akses LMS:

```text
Admin global:
- tetap pakai tb_users.role = Admin
- bisa sync, mapping, validasi, dan akses semua kelas
- masih bisa bantu kelola materi semua kelas

LMS Admin Univ:
- bisa melihat semua kelas/report LMS lewat lms_role_scopes
- belum diberi hak sync SIAK
- belum otomatis diberi hak mengubah materi dosen

LMS Admin Fakultas:
- bisa melihat kelas/report LMS hanya pada fakultas_id yang ditugaskan
- akses dihitung dari siak_sync_classes -> siak_sync_study_programs -> fakultas_id

LMS Admin Prodi:
- bisa melihat kelas/report LMS hanya pada prodi_id yang ditugaskan
- akses dihitung dari siak_sync_classes.prodi_id

Dosen/Dosen_Ext:
- bisa mengelola materi hanya pada kelas yang dia ampu
- dicocokkan dari req.user.nip ke data dosen pengajar kelas

Mahasiswa:
- bisa melihat materi/forum hanya pada kelas yang dia ambil
- dicocokkan dari req.user.npm ke peserta kelas
```

Endpoint pengelolaan scope:

```text
GET    /lms/role-scopes/me
GET    /lms/role-scopes?limit=25&page=1&role_key=lms_admin_prodi
POST   /lms/role-scopes
PATCH  /lms/role-scopes/:id
DELETE /lms/role-scopes/:id
```

Contoh payload Admin Prodi:

```json
{
  "user_id": "uuid-user-admin-prodi",
  "role_key": "lms_admin_prodi",
  "prodi_id": "TI"
}
```

Contoh payload Admin Fakultas:

```json
{
  "user_id": "uuid-user-admin-fakultas",
  "role_key": "lms_admin_fakultas",
  "fakultas_id": "FTS"
}
```

Catatan penting:

```text
Scope admin prodi/fakultas saat ini dipakai untuk akses baca/monitoring.
Endpoint tulis materi tetap dibatasi untuk Admin global atau dosen pengampu.
Forum dipisah: scoped admin bisa membaca forum, tetapi tidak otomatis bisa membuat thread/post.
```

### Tahap 7 - Projection LMS dari staging SIAK

Status: service, controller, dan route sudah disiapkan. Test mock berhasil memproyeksikan
2 kelas dan 3 peserta dari staging SIAK ke tabel lokal LMS.

Alur baru:

```text
POST /siak-sync/sync
  -> isi siak_sync_classes, siak_sync_class_lecturers, siak_sync_class_participants

GET /siak-sync/validation
  -> pastikan staging sehat

POST /lms/sync-siak
  -> project staging SIAK ke siak_v2_classes dan siak_v2_participants

GET /lms/classes
  -> daftar kelas LMS sesuai role/scope user
```

Tabel LMS lama tetap dipertahankan:

```text
siak_v2_classes
siak_v2_participants
```

Alasannya:

```text
lms_sections masih punya FK ke siak_v2_classes.kelasKuliahId.
Jadi sumber upstream diganti ke staging SIAK baru, tetapi kontrak internal LMS tetap stabil.
```

Hasil test akses `/lms/classes`:

```text
Admin global: 2 kelas
Dosen NIP 410100569: 1 kelas
Dosen NIP tidak cocok: 0 kelas
Mahasiswa NPM 0110220001: 1 kelas
LMS Admin Prodi TI: 2 kelas
LMS Admin Fakultas FTS: 2 kelas
LMS Admin Univ: 2 kelas
```

## 4. Kenapa Tidak Langsung Ganti `m_matakuliah`

Sistem berjalan masih punya relasi:

```text
pembelajaran_dosen_ext.id_matkul -> m_matakuliah.id
absensi_mhs.id_pembelajaran -> pembelajaran_dosen_ext.id
```

Karena itu `m_matakuliah.id` masih menjadi anchor absensi. Mengganti langsung ke SIAK baru
berisiko memutus data presensi lama.

Strategi aman:

```text
m_matakuliah.id
  -> matakuliah_siak_mapping
  -> mataKuliahId SIAK baru
```

## 5. Checklist Sebelum Endpoint SIAK Siap

- [ ] Kontrak API sudah dikirim dan disetujui Tim SIAK.
- [ ] Field wajib tidak dihapus dari response.
- [ ] Format pagination sudah disepakati.
- [x] Mock response sudah bisa dipakai untuk development.
- [x] Tabel staging sudah disiapkan.
- [x] Mapping `m_matakuliah` ke SIAK baru sudah punya rancangan.
- [ ] Semua mapping mata kuliah sudah diverifikasi.
- [x] Validator hasil sync sudah dirancang.
- [x] Role scope LMS Admin Univ/Fakultas/Prodi sudah disiapkan.
- [x] Projection LMS dari staging SIAK sudah disiapkan.
- [ ] Cut-over plan dan rollback plan sudah ditulis.
