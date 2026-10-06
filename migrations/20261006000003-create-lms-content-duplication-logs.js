'use strict';

/**
 * lms_content_duplication_logs — jejak PERISTIWA (bukan state konten) tiap kali dosen
 * menarik materi dari kelas lain lewat "Duplikat dari Kelas Lain" (permintaan Pak
 * Fitrah). Immutable / write-once: tidak ada updated_at/deleted_at. `detail` menyimpan
 * rincian topik & item yang disalin PLUS yang dikecualikan (attendance), supaya histori
 * lengkap walau isi lms_sections/lms_content_items berubah/terhapus kemudian.
 *
 * Tanpa FK ke siak_v2_classes/tb_users (read-only dari sudut LMS, pola sama dgn
 * LmsSubmission/LmsSection.id_lecture) — hanya UUID mentah, dijoin saat baca.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_content_duplication_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      source_kelas_kuliah_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      target_kelas_kuliah_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      sections_created: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      items_created: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      skipped_attendance_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      detail: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('lms_content_duplication_logs', ['target_kelas_kuliah_id'], {
      name: 'idx_lms_dup_logs_target',
    });
    await queryInterface.addIndex('lms_content_duplication_logs', ['source_kelas_kuliah_id'], {
      name: 'idx_lms_dup_logs_source',
    });
    await queryInterface.addIndex('lms_content_duplication_logs', ['actor_user_id'], {
      name: 'idx_lms_dup_logs_actor',
    });

    console.log('Table lms_content_duplication_logs created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lms_content_duplication_logs');
  },
};
