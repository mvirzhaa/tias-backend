'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ta_pelaksanaan_kelengkapan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pelaksanaan_id: { type: Sequelize.INTEGER, allowNull: false },
      kelengkapan_id: { type: Sequelize.INTEGER, allowNull: false },
      isian: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
    });
    await queryInterface.addIndex('ta_pelaksanaan_kelengkapan', ['pelaksanaan_id', 'kelengkapan_id'], {
      unique: true,
      name: 'uq_pelaksanaan_kelengkapan',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ta_pelaksanaan_kelengkapan');
  },
};
