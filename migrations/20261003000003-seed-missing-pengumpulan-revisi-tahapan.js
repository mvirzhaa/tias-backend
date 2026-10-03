'use strict';

// Aturan sistem: setiap (prodi, skema) yang sudah punya minimal 1 Tahapan TA
// WAJIB diakhiri tahapan "Pengumpulan Revisi" - sebelumnya ini tergantung
// admin ingat menambahkannya sendiri lewat halaman Tahapan TA, jadi beberapa
// skema yang sudah dibuat production (mis. skema "Project") belum punya.
// Migrasi ini SEKALI jalan melengkapi yang kurang; ke depannya
// controllers/master-ta/tahapanController.js#create menjaga invarian ini
// otomatis setiap kali admin menambah tahapan baru.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO ta_tahapan (prodi_id, skema_id, nama_tahapan, is_active, urutan, created_at)
      SELECT t.prodi_id, t.skema_id, 'Pengumpulan Revisi', true, MAX(t.urutan) + 1, NOW()
      FROM ta_tahapan t
      WHERE t.deleted_at IS NULL
      GROUP BY t.prodi_id, t.skema_id
      HAVING NOT EXISTS (
        SELECT 1 FROM ta_tahapan t2
        WHERE t2.prodi_id = t.prodi_id
          AND t2.skema_id = t.skema_id
          AND t2.deleted_at IS NULL
          AND LOWER(TRIM(t2.nama_tahapan)) = 'pengumpulan revisi'
      )
    `);
  },

  async down() {
    // Sengaja tidak dibalik - tidak ada cara aman membedakan baris yang
    // dibuat migrasi ini dari yang sudah ada sebelumnya atau ditambahkan
    // admin setelahnya.
  },
};
