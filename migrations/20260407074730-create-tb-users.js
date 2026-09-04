'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tb_users', {
      user_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      role: { type: Sequelize.STRING },
      email: { type: Sequelize.STRING },
      nidn: { type: Sequelize.STRING },
      npm: { type: Sequelize.STRING },
      isverified: { type: Sequelize.BOOLEAN },
      password: { type: Sequelize.STRING },
      curr_code: { type: Sequelize.STRING },
      department_code: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tb_users');
  }
};