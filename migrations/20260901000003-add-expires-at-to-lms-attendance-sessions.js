'use strict';

// lms_attendance_sessions.expires_at — batas waktu OTOMATIS (dinamis, ditentukan dosen saat
// membuat aktivitas presensi lewat durasi_menit di payload item, lihat
// lib/lms/payloadValidators.js validateAttendance). NULLable: null = tanpa batas waktu,
// tetap harus ditutup manual (perilaku lama). Tidak ada cron yang flip status ke 'closed'
// begitu lewat expires_at — dicek lazy tiap dibaca/ditulis (lihat isSessionActive di
// controllers/lms/attendanceController.js), konsisten dgn tidak adanya infrastruktur job
// queue/scheduler untuk hal ini di codebase.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lms_attendance_sessions', 'expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lms_attendance_sessions', 'expires_at');
  },
};
