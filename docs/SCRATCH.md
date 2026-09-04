# Scratch Scripts

Folder `scratch/` berisi script manual untuk debug, investigasi data, dan percobaan lokal.
Script di sana bukan bagian dari runtime utama aplikasi.

Contoh isi:

- `scratch_check_api*.js`: cek response API absensi.
- `scratch_check_dosen.js`: cek contoh data dosen dan pembelajaran.
- `scratch_check_matkul_kelas.js`: cek data `m_matakuliah` dan `siak_class`.
- `scratch_db_structure.js`: generate ringkasan model Sequelize.
- `scratch_list_tables.js`: cek daftar tabel PostgreSQL.
- `verify_data.js`: cek data parent, matkul, pembelajaran, dan absensi.

Peringatan:

- Jalankan manual hanya saat paham efeknya.
- Beberapa script membaca `.env` dan dapat hit database/API nyata.
- `sync_db.js` menjalankan `sequelize.sync({ alter: true })`; jangan jalankan ke database
  staging/production.
- `run-lms-migrations.js` sudah dianggap usang oleh `docs/MIGRATION_DEPLOY.md`; gunakan
  prosedur migrasi resmi di dokumen tersebut.
