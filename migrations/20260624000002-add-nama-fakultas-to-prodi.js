'use strict';

/**
 * Tambah kolom `nama_fakultas` ke siak_v2_program_studi.
 *
 * Alasan: payload publik SIAK v2 memuat mataKuliah.programStudi.fakultas { id, nama },
 * tetapi skema hanya menyimpan siakFakultasId (UUID) — tanpa nama → FE menampilkan
 * "Fakultas —". Kolom ini menyimpan nama fakultas (denormalisasi) agar /lms/classes
 * dapat menyajikan label fakultas tanpa dimensi/tabel fakultas terpisah.
 *
 * Idempoten secara praktik: kolom baru nullable, diisi oleh sync v2 berikutnya
 * (lihat syncService upsert + adapter programStudi.nama_fakultas).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('siak_v2_program_studi', 'nama_fakultas', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('siak_v2_program_studi', 'nama_fakultas');
  },
};
