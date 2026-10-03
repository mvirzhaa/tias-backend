'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_pelaksanaan_penilaian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pelaksanaan_id: { type: Sequelize.INTEGER, allowNull: false },
      tahapan_id: { type: Sequelize.INTEGER, allowNull: false },
      komponen_id: { type: Sequelize.INTEGER, allowNull: false },
      dosen_id: { type: Sequelize.UUID, allowNull: false },
      nilai: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
    });
    await queryInterface.addIndex(
      'ta_pelaksanaan_penilaian',
      ['pelaksanaan_id', 'tahapan_id', 'komponen_id', 'dosen_id'],
      { unique: true, name: 'uq_pelaksanaan_penilaian' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_pelaksanaan_penilaian');
  },
};
