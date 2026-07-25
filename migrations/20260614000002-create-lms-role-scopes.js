'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_role_scopes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tb_users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role_key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      scope_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fakultas_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      prodi_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('lms_role_scopes', ['user_id', 'is_active'], {
      name: 'idx_lms_role_scopes_user_active',
    });
    await queryInterface.addIndex('lms_role_scopes', ['role_key', 'scope_type'], {
      name: 'idx_lms_role_scopes_role_scope',
    });
    await queryInterface.addIndex('lms_role_scopes', ['fakultas_id'], {
      name: 'idx_lms_role_scopes_fakultas',
    });
    await queryInterface.addIndex('lms_role_scopes', ['prodi_id'], {
      name: 'idx_lms_role_scopes_prodi',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lms_role_scopes');
  },
};
