'use strict';

/**
 * lms_attendance_sessions — instance pertemuan presensi (BUKAN jadwal rutin).
 *
 * `siak_v2_jadwal` cuma template mingguan (hari/jam berulang), tidak punya konsep
 * "pertemuan ke-N tanggal X yang sedang dibuka dosen sekarang" — tabel ini mengisi gap itu.
 *
 * `metode_pembelajaran_snapshot`/`is_offline` di-snapshot SEKALI saat sesi dibuka (bukan
 * live-join ke siak_v2_jadwal), supaya sesi yang sudah berjalan tidak berubah semantik kalau
 * jadwal diedit belakangan.
 *
 * `geofence_lat/lng` = koordinat device DOSEN saat membuka sesi (tidak ada tabel koordinat
 * ruangan di sistem ini) — dipakai sebagai titik anchor geofence untuk kelas offline saja.
 *
 * kelasKuliahId/jadwal_id/opened_by sengaja TANPA FK constraint — konsisten dengan pola
 * siak_v2_* (sync-replaceable, bukan tabel yang kita miliki) di seluruh modul LMS lain
 * (lihat lms_submissions.siak_mahasiswa_id).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_attendance_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      kelasKuliahId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      jadwal_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      opened_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      pertemuan_ke: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      session_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      token: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      metode_pembelajaran_snapshot: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      is_offline: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      ruangan_nama_snapshot: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      geofence_lat: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      geofence_lng: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      geofence_accuracy_m: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      geofence_radius_m: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'open',
      },
      opened_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      closed_at: {
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

    await queryInterface.addIndex('lms_attendance_sessions', ['kelasKuliahId'], {
      name: 'idx_lms_attendance_sessions_kelas',
    });

    // Token hanya wajib unik selagi sesi masih 'open' — sesi lama yang sudah ditutup
    // tidak permanen membakar satu kombinasi token 6 digit.
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX "uq_lms_attendance_sessions_token_active" ' +
        'ON "lms_attendance_sessions" ("token") ' +
        'WHERE "deleted_at" IS NULL AND "status" = \'open\';'
    );

    console.log('Table lms_attendance_sessions created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "uq_lms_attendance_sessions_token_active";'
    );
    await queryInterface.dropTable('lms_attendance_sessions');
  },
};
