'use strict';

/**
 * FASE 5 (Forum) — `lms_forum_posts` (SPEC v6 §3.3 / v3).
 *
 * Satu baris = satu balasan dalam sebuah thread. MVP reply 1-level: `parent_post_id`
 * boleh menunjuk post induk (balasan ke post utama) ATAU null (post langsung di thread).
 * Aturan "maksimal 1 level" ditegakkan di layer app (tolak balas ke post yang sudah punya parent).
 * author_id = tb_users.user_id (UUID, tanpa FK). Edit/hapus hanya milik sendiri (otorisasi app).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_forum_posts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      thread_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'lms_forum_threads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      parent_post_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'lms_forum_posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      author_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      edited: {
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

    await queryInterface.addIndex('lms_forum_posts', ['thread_id'], {
      name: 'idx_lms_forum_posts_thread_id',
    });
    await queryInterface.addIndex('lms_forum_posts', ['parent_post_id'], {
      name: 'idx_lms_forum_posts_parent_post_id',
    });

    console.log('Table lms_forum_posts created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lms_forum_posts');
  },
};
