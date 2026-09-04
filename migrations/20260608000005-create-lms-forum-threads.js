'use strict';

/**
 * FASE 5 (Forum) — `lms_forum_threads` (SPEC v6 §3.3 / v3: "sama v2").
 *
 * Satu baris = satu topik diskusi di dalam sebuah content item bertipe `forum`.
 * author_id = tb_users.user_id pembuat (UUID, tanpa FK — konsisten dgn lms_sections.id_lecture;
 * tb_users dikelola sistem eksisting). Pin/lock hanya dosen pengampu/admin (otorisasi di layer app).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_forum_threads', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      content_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'lms_content_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      author_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_pinned: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('lms_forum_threads', ['content_item_id'], {
      name: 'idx_lms_forum_threads_content_item_id',
    });

    console.log('Table lms_forum_threads created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lms_forum_threads');
  },
};
