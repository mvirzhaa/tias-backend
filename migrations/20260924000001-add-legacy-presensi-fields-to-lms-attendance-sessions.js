'use strict';

// Samakan field lms_attendance_sessions dengan form presensi lama
// (ucl.uika-bogor.ac.id/dosen/absen/daftar-hadir/generate), supaya data yang diinput dosen saat
// generate presensi LMS lengkap dan siap dipakai saat bridge ke Laravel fts-absen dibangun
// (lihat plan "Bridge: LMS Generate Presensi -> Sinkron ke Presensi Laravel").
// rps_dasar/rps_pelaksanaan/dosen_tamu: teks bebas, sama seperti pembelajaran_dosen_ext.
// dosen_pengganti_user_id: UUID tb_users.user_id (identitas dosen di LMS, bukan NIK).
// komti_siak_mahasiswa_id: UUID siak_mahasiswa_id (identitas mahasiswa di LMS, konsisten dgn
// pola siak_mahasiswa_id di lms_attendance_records/siak_v2_participants).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lms_attendance_sessions', 'rps_dasar', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('lms_attendance_sessions', 'rps_pelaksanaan', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('lms_attendance_sessions', 'dosen_pengganti_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('lms_attendance_sessions', 'dosen_tamu', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('lms_attendance_sessions', 'komti_siak_mahasiswa_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lms_attendance_sessions', 'rps_dasar');
    await queryInterface.removeColumn('lms_attendance_sessions', 'rps_pelaksanaan');
    await queryInterface.removeColumn('lms_attendance_sessions', 'dosen_pengganti_user_id');
    await queryInterface.removeColumn('lms_attendance_sessions', 'dosen_tamu');
    await queryInterface.removeColumn('lms_attendance_sessions', 'komti_siak_mahasiswa_id');
  },
};
