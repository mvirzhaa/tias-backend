'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_kelengkapan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tahapan_id: { type: Sequelize.INTEGER, allowNull: false },
      nama_kelengkapan: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_kelengkapan');
  },
};
