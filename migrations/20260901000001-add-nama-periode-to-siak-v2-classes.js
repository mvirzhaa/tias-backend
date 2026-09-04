'use strict';

/**
 * siak_v2_classes.nama_periode — label periode akademik manusiawi (mis. "2025 Ganjil"),
 * dari payload SIAK `periodeAkademik.nama` (lihat lib/lms/siakV2/adapter.js). Sebelumnya
 * cuma `siakPeriodeAkademikId` (UUID) yang disimpan — tidak bisa ditampilkan ke user.
 *
 * Dipakai untuk membedakan kelas yang kelihatan "duplikat" di listing (nama+kode+kelas sama
 * tapi kelasKuliahId beda) padahal itu penawaran di periode akademik yang berbeda (SIAK
 * menjalankan banyak periode aktif bersamaan — reguler/karyawan/S1/S2 dll, lihat
 * lib/lms/siakStagingBridgeService.js).
 *
 * NULLable & tidak backfill otomatis — terisi saat kelas di-sync ULANG lewat sync SIAK v2
 * yang sudah ada (mengisi dari data lama butuh panggil live SIAK API, bukan migrasi DB murni).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('siak_v2_classes', 'nama_periode', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('siak_v2_classes', 'nama_periode');
  },
};
