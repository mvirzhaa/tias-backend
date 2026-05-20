'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop existing if any to ensure clean state
    await queryInterface.dropTable('kategori_publikasi', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('kategori_profesi', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('kategori_prestasi', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('kategori_sertifikasi', { cascade: true }).catch(() => {});

    // kategori_sertifikasi
    await queryInterface.createTable('kategori_sertifikasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kategori: { type: Sequelize.STRING },
      point: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.bulkInsert('kategori_sertifikasi', [
      { id: 1, nama_kategori: 'Sertifikasi Kompetensi Nasional', point: 10, created_at: new Date(), updated_at: new Date() },
      { id: 2, nama_kategori: 'Sertifikasi Internasional', point: 20, created_at: new Date(), updated_at: new Date() },
      { id: 3, nama_kategori: 'Pelatihan Soft Skill', point: 5, created_at: new Date(), updated_at: new Date() }
    ]);

    // kategori_prestasi
    await queryInterface.createTable('kategori_prestasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kategori: { type: Sequelize.STRING },
      juara: { type: Sequelize.STRING },
      point: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.bulkInsert('kategori_prestasi', [
      { id: 1, nama_kategori: 'Lomba Nasional', juara: 'Juara 1', point: 15, created_at: new Date(), updated_at: new Date() },
      { id: 2, nama_kategori: 'Lomba Internasional', juara: 'Finalis', point: 10, created_at: new Date(), updated_at: new Date() }
    ]);

    // kategori_profesi
    await queryInterface.createTable('kategori_profesi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kategori: { type: Sequelize.STRING },
      point: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.bulkInsert('kategori_profesi', [
      { id: 1, nama_kategori: 'Anggota Organisasi Nasional', point: 5, created_at: new Date(), updated_at: new Date() }
    ]);

    // kategori_publikasi
    await queryInterface.createTable('kategori_publikasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nama_kategori: { type: Sequelize.STRING },
      tingkatan: { type: Sequelize.STRING },
      point: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.bulkInsert('kategori_publikasi', [
      { id: 1, nama_kategori: 'Pengabdian Masyarakat Terstruktur', tingkatan: 'Nasional', point: 10, created_at: new Date(), updated_at: new Date() },
      { id: 2, nama_kategori: 'Pembicara Seminar', tingkatan: 'Regional', point: 5, created_at: new Date(), updated_at: new Date() }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('kategori_publikasi');
    await queryInterface.dropTable('kategori_profesi');
    await queryInterface.dropTable('kategori_prestasi');
    await queryInterface.dropTable('kategori_sertifikasi');
  }
};
