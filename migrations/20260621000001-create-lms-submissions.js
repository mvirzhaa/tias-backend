'use strict';

/**
 * A5 (Assignment) — `lms_submissions`.
 *
 * Satu baris = pengumpulan tugas seorang mahasiswa pada satu assignment (content item
 * type=assignment; config tugas ada di lms_content_items.payload — TIDAK ada tabel
 * lms_assignments terpisah). FK ke item; CASCADE saat item terhapus keras (soft-delete
 * cascade ditangani layer app, lihat sectionController/contentItemController).
 *
 * siak_mahasiswa_id = req.user.siakUserUuid (UUID, tanpa FK — konsisten dgn id_lecture/
 * author_id; siak_v2_* read-only). Otorisasi tingkat-baris di layer app (anti IDOR-baris).
 *
 * Partial UNIQUE(content_item_id, siak_mahasiswa_id) WHERE deleted_at IS NULL →
 * satu submission AKTIF per mahasiswa per assignment (resubmit = overwrite baris sama),
 * namun soft-delete tetap memungkinkan baris baru di kemudian hari.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_submissions', {
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
      siak_mahasiswa_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      storage_key: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mime: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      is_late: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      graded_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      graded_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('lms_submissions', ['content_item_id'], {
      name: 'idx_lms_submissions_content_item_id',
    });

    // Partial unique: satu submission AKTIF per (assignment, mahasiswa).
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX "uq_lms_submissions_item_mhs_active" ' +
        'ON "lms_submissions" ("content_item_id", "siak_mahasiswa_id") ' +
        'WHERE "deleted_at" IS NULL;'
    );

    console.log('Table lms_submissions created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "uq_lms_submissions_item_mhs_active";'
    );
    await queryInterface.dropTable('lms_submissions');
  },
};
