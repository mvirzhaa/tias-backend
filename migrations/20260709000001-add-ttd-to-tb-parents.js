'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('tb_parents', 'ttd', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('sudah ada')) {
        throw error;
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tb_parents', 'ttd');
  },
};
