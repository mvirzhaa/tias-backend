'use strict';

/**
 * lms_attendance_sessions.legacy_token / legacy_sync_status — jembatan ke sistem presensi
 * lama (Laravel `fts-absen`, permintaan Pak Fitrah). Saat dosen buka sesi presensi LMS,
 * backend MENCOBA (best-effort) juga bikin `pembelajaran` di fts-absen supaya QR-nya bisa
 * di-scan lewat UCL Mobile (alur wajah+GPS yang sudah ada di sana) dan presensinya otomatis
 * tercatat di absensi_mhs milik fts-absen (bukan tabel lokal Postgres) — tanpa sinkronisasi
 * tambahan karena itu baris presensi yang SAMA, bukan salinan.
 *
 * `legacy_token` NULL bila jembatan gagal/tak tersedia (mis. matkul belum ada di m_matakuliah
 * lokal, atau fts-absen sedang down) — sesi LMS TETAP jalan pakai token/alur native LMS
 * sebagai fallback, lihat lib/lms/legacyAttendanceBridge.js.
 * `legacy_sync_status`: 'linked' | 'unmapped' | 'failed' | null (item lama sebelum kolom ini).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lms_attendance_sessions', 'legacy_token', {
      type: Sequelize.STRING(16),
      allowNull: true,
    });
    await queryInterface.addColumn('lms_attendance_sessions', 'legacy_sync_status', {
      type: Sequelize.STRING(16),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lms_attendance_sessions', 'legacy_sync_status');
    await queryInterface.removeColumn('lms_attendance_sessions', 'legacy_token');
  },
};
