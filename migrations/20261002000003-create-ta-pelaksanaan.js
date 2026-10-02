'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_pelaksanaan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pengajuan_id: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      mhs_id: { type: Sequelize.UUID, allowNull: false },
      tahapan_id: { type: Sequelize.INTEGER, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'berjalan' },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_pelaksanaan');
  },
};
