'use strict';

// Komentar Singkat dosen/evaluator per tahapan penilaian - di sistem lama ini 1
// kolom nempel di baris submission dosen (ta_penilaian_kolokium/sidang punya 1
// baris per dosen, bukan per komponen). Di skema baru, nilai disimpan 1 baris
// per (dosen, komponen) - lih. ta_pelaksanaan_penilaian - jadi komentar butuh
// tabel sendiri, 1 baris per (pelaksanaan, tahapan, dosen), supaya dosen bisa
// isi komentar terlepas dari berapa komponen yang sudah/belum dia nilai.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_pelaksanaan_penilaian_komentar', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pelaksanaan_id: { type: Sequelize.INTEGER, allowNull: false },
      tahapan_id: { type: Sequelize.INTEGER, allowNull: false },
      dosen_id: { type: Sequelize.UUID, allowNull: false },
      komentar_singkat: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
    });

    await queryInterface.addIndex(
      'ta_pelaksanaan_penilaian_komentar',
      ['pelaksanaan_id', 'tahapan_id', 'dosen_id'],
      { unique: true, name: 'uq_pelaksanaan_penilaian_komentar' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_pelaksanaan_penilaian_komentar');
  },
};
