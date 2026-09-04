'use strict';

/**
 * lms_attendance_attempts — log SETIAP percobaan submit presensi, sukses maupun gagal.
 *
 * Alasan tabel ini perlu ada meski tidak diminta eksplisit: aturan "tanpa fallback" (gagal
 * verifikasi wajah = tidak ada apa-apa tersimpan) berarti tanpa log ini kegagalan tidak
 * meninggalkan jejak sama sekali — menyulitkan (a) rate-limiting percobaan terhadap face-api
 * eksternal yang dipanggil tiap kali (anti-abuse) dan (b) menjawab "kenapa presensi saya
 * gagal?" ke mahasiswa/dukungan. Append-only, tidak soft-delete.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_attendance_attempts', {
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
      siak_mahasiswa_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      outcome: {
        // success | not_enrolled | session_closed | geofence_failed | face_not_enrolled |
        // face_no_match | face_api_error | duplicate
        type: Sequelize.STRING(24),
        allowNull: false,
      },
      gps_distance_m: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      face_score: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      attempted_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('lms_attendance_attempts', ['session_id', 'siak_mahasiswa_id'], {
      name: 'idx_lms_attendance_attempts_session_mhs',
    });

    console.log('Table lms_attendance_attempts created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lms_attendance_attempts');
  },
};
