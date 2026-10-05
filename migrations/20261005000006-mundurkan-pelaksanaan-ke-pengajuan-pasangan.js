'use strict';

// Tahapan "Pengajuan X" baru disisipkan (migrasi 20261005000004) SEBELUM urutan
// tahapan "X" yang sudah dijalani sebagian mahasiswa - akibatnya mahasiswa yang
// SAAT INI persis di tahapan "X" (belum lanjut lebih jauh) jadi "melewati" tahapan
// Pengajuan yang baru ada itu tanpa pernah benar-benar mengisinya (krn waktu itu
// belum ada). Migrasi ini SEKALI jalan memundurkan pointer mereka ke "Pengajuan X"
// supaya tahapan itu kelihatan aktif/bisa diisi - bukan tercentang "selesai" palsu.
//
// SENGAJA cuma mahasiswa yang PERSIS di tahapan "X" (belum lanjut lebih jauh) yang
// disentuh - yang statusnya sudah 'selesai' atau sudah lanjut ke tahapan setelah
// "X" TIDAK diutak-atik, supaya tidak makin mengacaukan progres yang sudah lanjut.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE ta_pelaksanaan p
      SET tahapan_id = pengajuan_t.id, updated_at = NOW()
      FROM ta_tahapan current_t
      JOIN ta_tahapan pengajuan_t
        ON pengajuan_t.prodi_id = current_t.prodi_id
       AND pengajuan_t.skema_id = current_t.skema_id
       AND LOWER(TRIM(pengajuan_t.nama_tahapan)) = 'pengajuan ' || LOWER(TRIM(current_t.nama_tahapan))
       AND pengajuan_t.deleted_at IS NULL
      WHERE p.tahapan_id = current_t.id
        AND p.status = 'berjalan'
        AND current_t.deleted_at IS NULL
        AND LOWER(TRIM(current_t.nama_tahapan)) NOT LIKE 'pengajuan %'
        AND LOWER(TRIM(current_t.nama_tahapan)) != 'pengumpulan revisi'
    `);
  },

  async down() {
    // Sengaja tidak dibalik - sama alasannya spt migrasi seed lain di modul ini:
    // tidak ada cara aman membedakan baris yang kena efek migrasi ini vs mahasiswa
    // yang admin majukan lagi manual setelahnya.
  },
};
