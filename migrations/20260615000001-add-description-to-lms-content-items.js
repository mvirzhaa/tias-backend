'use strict';

/**
 * Tambah kolom `description` (teks bebas, opsional) ke lms_content_items.
 * Dipakai dosen untuk menjelaskan tiap aktivitas/sumber saat menambah/edit item.
 * Disimpan sebagai kolom tersendiri (bukan di payload) karena validator payload
 * per-tipe (page/url/video) menormalkan bentuk & akan membuang field tak dikenal.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lms_content_items', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lms_content_items', 'description');
  },
};
