'use strict';

// Metadata per (pelaksanaan, tahapan) - jadwal pelaksanaan, evaluator, dan ACC
// dosen pembimbing (dicentang ADMIN, bukan dosen sendiri - krn ACC-nya berupa
// surat fisik yang diterima admin). Satu baris per kombinasi pelaksanaan+
// tahapan, baris baru otomatis "kosong" lagi begitu pelaksanaan lanjut ke
// tahapan berikutnya (sama seperti ta_pendaftaran_kolokium terpisah dari
// ta_pendaftaran_sidang di sistem lama - ACC tidak "ngikut" ke tahapan lain).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_pelaksanaan_tahapan_meta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pelaksanaan_id: { type: Sequelize.INTEGER, allowNull: false },
      tahapan_id: { type: Sequelize.INTEGER, allowNull: false },
      jadwal_pelaksanaan: { type: Sequelize.DATEONLY, allowNull: true },
      evaluator_1: { type: Sequelize.UUID, allowNull: true },
      evaluator_2: { type: Sequelize.UUID, allowNull: true },
      acc_pembimbing_1: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      acc_pembimbing_2: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      acc_kepala_lab: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
    });

    await queryInterface.addIndex('ta_pelaksanaan_tahapan_meta', ['pelaksanaan_id', 'tahapan_id'], {
      unique: true,
      name: 'ta_pelaksanaan_tahapan_meta_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_pelaksanaan_tahapan_meta');
  },
};
