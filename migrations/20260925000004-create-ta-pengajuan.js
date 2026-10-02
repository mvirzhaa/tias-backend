'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_pengajuan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mhs_id: { type: Sequelize.UUID, allowNull: false },
      nama: { type: Sequelize.STRING, allowNull: false },
      npm: { type: Sequelize.STRING, allowNull: false },
      skema_id: { type: Sequelize.INTEGER, allowNull: false },
      judul: { type: Sequelize.STRING, allowNull: false },
      pembimbing_1: { type: Sequelize.UUID, allowNull: false },
      pembimbing_2: { type: Sequelize.UUID, allowNull: true },
      pembimbing_luar: { type: Sequelize.STRING, allowNull: true },
      kepala_lab: { type: Sequelize.UUID, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'diajukan' },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_pengajuan');
  },
};
