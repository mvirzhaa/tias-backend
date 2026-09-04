'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trx_parent_mhs", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      mhs_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("trx_parent_mhs");
  },
};
