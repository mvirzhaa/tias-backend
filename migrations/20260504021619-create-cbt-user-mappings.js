'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cbt_user_mappings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tias_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'tb_users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nim: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cbt_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Simpan token agar tidak SSO ulang setiap saat
      cbt_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cbt_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('cbt_user_mappings', ['tias_user_id']);
    await queryInterface.addIndex('cbt_user_mappings', ['email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cbt_user_mappings');
  },
};
