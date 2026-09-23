'use strict';

/**
 * lms_attendance_sessions.legacy_error — pesan error mentah (atau ringkasan respons error)
 * saat jembatan ke fts-absen gagal (legacy_sync_status='failed'). Sengaja disimpan & ikut
 * terekspos lewat API sesi (bukan cuma console.error di server) supaya diagnosis kegagalan
 * tidak perlu akses SSH/log server tiap kali — lihat lib/lms/legacyAttendanceBridge.js dan
 * controllers/lms/attendanceController.js#openSession.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lms_attendance_sessions', 'legacy_error', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lms_attendance_sessions', 'legacy_error');
  },
};
