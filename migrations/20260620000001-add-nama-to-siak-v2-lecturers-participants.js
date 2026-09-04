'use strict';

/**
 * BRIEF v2 Task 6 — tambah kolom `nama` ke siak_v2_class_lecturers & siak_v2_participants.
 *
 * Alasan: auto-bridge NIDN dosen mati (UCL tak punya NIDN dosen nyata — lihat diagnosis).
 * Linking dosen kini bertumpu pada review admin dengan SARAN match berbasis nama. Nama
 * dosen/mahasiswa tersedia di payload SIAK v2 (jadwalKuliah[].dosen.nama, peserta.nama)
 * tetapi sebelumnya tidak disimpan. Kolom ini menyimpannya sebagai sumber saran/identifikasi.
 *
 * Idempoten secara praktik: kolom baru nullable, diisi oleh sync v2 berikutnya.
 * WAJIB dijalankan SEBELUM endpoint /siak-sync/user-mappings/unmatched dipakai (query
 * unmatched dosen membaca siak_v2_class_lecturers.nama).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('siak_v2_class_lecturers', 'nama', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('siak_v2_participants', 'nama', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('siak_v2_participants', 'nama');
    await queryInterface.removeColumn('siak_v2_class_lecturers', 'nama');
  },
};
