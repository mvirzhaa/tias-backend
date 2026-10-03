'use strict';

// Skema "Skripsi" (is_legacy=true, mengarah ke pipeline kolokium/sidang yang
// sudah ada) adalah skema paling dasar yang HARUS tersedia di form Pengajuan
// TA - sebelumnya ini harus dibuat admin manual lewat halaman Skema TA dan
// ternyata belum sempat dibuat, jadi mahasiswa yang mau ajukan skripsi tidak
// punya pilihan sama sekali. Disamakan dgn "Pengumpulan Revisi" - jangan
// bergantung ke admin ingat, seed otomatis kalau belum ada (cek nama,
// case-insensitive, supaya tidak dobel kalau admin kebetulan sudah buat
// sendiri sebelum migrasi ini jalan).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO ta_skema (nama_skema, deskripsi, is_active, is_legacy, created_at)
      SELECT 'Skripsi', 'Skema skripsi reguler (kolokium & sidang)', true, true, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM ta_skema WHERE LOWER(TRIM(nama_skema)) = 'skripsi' AND deleted_at IS NULL
      )
    `);
  },

  async down() {
    // Sengaja tidak dibalik - tidak ada cara aman membedakan baris yang
    // dibuat migrasi ini dari yang dibuat admin setelahnya, dan skema ini
    // mungkin sudah dipakai mahasiswa untuk mengajukan TA.
  },
};
