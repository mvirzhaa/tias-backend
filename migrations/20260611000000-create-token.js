'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('token', {
      token_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.TEXT
      },
      verif_token: {
        type: Sequelize.TEXT
      },
      reset_token: {
        type: Sequelize.TEXT
      },
      login_token: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE
      },
      expires_at: {
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('token');
  }
};
