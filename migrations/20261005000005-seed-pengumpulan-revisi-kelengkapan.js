'use strict';

// Tahapan "Pengumpulan Revisi" (wajib ada di tiap skema, lihat migrasi
// 20261003000003 & tahapanController#create) perlu kelengkapan standar:
// "Lembar Pengesahan" dan "Dokumen Tugas Akhir" - menyamai sistem lama (Form
// Pengumpulan Final Skripsi: Lembar Pengesahan + Dokumen Skripsi), hanya
// istilah "Dokumen Skripsi" diganti "Dokumen Tugas Akhir" karena skema baru
// tidak selalu skripsi. Sekali jalan, idempoten per (tahapan_id, nama) -
// aman dijalankan ulang / di skema yang sudah sempat diisi admin manual.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const nama of ['Lembar Pengesahan', 'Dokumen Tugas Akhir']) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO ta_kelengkapan (tahapan_id, nama_kelengkapan, created_at)
        SELECT t.id, :nama, NOW()
        FROM ta_tahapan t
        WHERE t.deleted_at IS NULL
          AND LOWER(TRIM(t.nama_tahapan)) = 'pengumpulan revisi'
          AND NOT EXISTS (
            SELECT 1 FROM ta_kelengkapan k
            WHERE k.tahapan_id = t.id
              AND k.deleted_at IS NULL
              AND LOWER(TRIM(k.nama_kelengkapan)) = LOWER(:nama)
          )
        `,
        { replacements: { nama } }
      );
    }
  },

  async down() {
    // Sengaja tidak dibalik - sama alasannya spt migrasi seed lain di modul
    // ini (tidak ada cara aman membedakan baris migrasi vs isian admin).
  },
};
