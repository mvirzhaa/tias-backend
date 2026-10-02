'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_tahapan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      prodi_id: { type: Sequelize.UUID, allowNull: false },
      skema_id: { type: Sequelize.INTEGER, allowNull: false },
      nama_tahapan: { type: Sequelize.STRING, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_tahapan');
  },
};
