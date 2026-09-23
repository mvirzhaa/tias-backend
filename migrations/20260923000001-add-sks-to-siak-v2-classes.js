'use strict';

/**
 * siak_v2_classes.sks — jumlah SKS mata kuliah, dari payload SIAK `mataKuliah.sks`
 * (lihat lib/lms/siakV2/adapter.js `parseKelas`). Sebelumnya field ini tidak pernah
 * di-parse/disimpan sama sekali di jalur sync v2 (pull-direct `/api/public`), beda
 * dengan tabel staging v1 lama (`siak_sync_staging.sks`) yang sudah dimatikan —
 * akibatnya listing kelas LMS (`GET /lms/classes`) tidak bisa menampilkan SKS
 * meski datanya sudah ada di SIAKAD.
 *
 * NULLable & tidak backfill otomatis — terisi saat kelas di-sync ULANG lewat sync
 * SIAK v2 yang sudah ada (mengisi dari data lama butuh panggil live SIAK API, bukan
 * migrasi DB murni).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('siak_v2_classes', 'sks', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('siak_v2_classes', 'sks');
  },
};
