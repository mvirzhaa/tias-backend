'use strict';

/**
 * lms_attendance_records — satu baris = satu presensi BERHASIL (token+GPS-jika-offline+wajah
 * cocok). Tidak ada baris fallback/manual: kegagalan apapun di alur presensi tidak menulis
 * apa-apa di sini (lihat lms_attendance_attempts untuk jejak kegagalan).
 *
 * session_id → FK nyata (CASCADE) karena lms_attendance_sessions adalah tabel yang KITA
 * miliki (bukan proyeksi SIAK). siak_mahasiswa_id TANPA FK, konsisten dengan
 * lms_submissions.siak_mahasiswa_id (identitas dari siak_v2_participants, read-only/sync).
 *
 * Partial UNIQUE(session_id, siak_mahasiswa_id) WHERE deleted_at IS NULL = guard duplikat di
 * level DB (setara "mahasiswa sudah absen" pada AbsensiMhs lama), bukan cuma app-layer check,
 * supaya race condition dua request bersamaan tidak lolos berdua.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_attendance_records', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'lms_attendance_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kelasKuliahId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      siak_mahasiswa_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      metode: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'face',
      },
      status: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'hadir',
      },
      gps_lat: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      gps_lng: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      gps_accuracy_m: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      gps_distance_m: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      face_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      face_threshold: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      face_match: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      face_photo_storage_key: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
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

    await queryInterface.addIndex('lms_attendance_records', ['session_id'], {
      name: 'idx_lms_attendance_records_session_id',
    });
    await queryInterface.addIndex('lms_attendance_records', ['siak_mahasiswa_id'], {
      name: 'idx_lms_attendance_records_mahasiswa',
    });

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX "uq_lms_attendance_records_session_mhs_active" ' +
        'ON "lms_attendance_records" ("session_id", "siak_mahasiswa_id") ' +
        'WHERE "deleted_at" IS NULL;'
    );

    console.log('Table lms_attendance_records created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "uq_lms_attendance_records_session_mhs_active";'
    );
    await queryInterface.dropTable('lms_attendance_records');
  },
};
