'use strict';

/**
 * FASE 1 — `lms_content_items` (SPEC v6 §3.2).
 *
 * Satu baris = satu aktivitas/sumber di dalam sebuah section (Page/PPT/PDF/Video/URL/
 * Forum/Exam/Assignment). Detail payload per-tipe & validasi/sanitasi diisi Fase 3+
 * (single-table + JSONB, integritas payload dikorbankan secara sadar — §9 v3).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_content_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      section_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'lms_sections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'page',
          'ppt',
          'pdf',
          'video',
          'url',
          'forum',
          'exam',
          'assignment'
        ),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      payload: {
        type: Sequelize.JSONB,
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('lms_content_items', ['section_id'], {
      name: 'idx_lms_content_items_section_id',
    });

    console.log('Table lms_content_items created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lms_content_items');
    // Postgres: ENUM type tidak ikut terhapus saat dropTable — buang manual.
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_lms_content_items_type";'
    );
  },
};
