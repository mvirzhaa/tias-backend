'use strict';

/**
 * SPEC v8 §2.1 — `siak_v2_classes` (FULL SYNC).
 *
 * Sumber kebenaran kelas/jadwal disalin PERMANEN ke lokal lewat "Tombol Synchronize"
 * (POST /lms/sync-siak). Otorisasi LMS membaca tabel ini, BUKAN API SIAK live.
 * PK = `kelasKuliahId` (UUID dari SIAK v2).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('siak_v2_classes', {
      kelasKuliahId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      kode_matakuliah: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_matakuliah: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_kelas: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      dosen_pengampu_nip: {
        // Array string NIP dosen pengampu (dipakai lecturerOwnsClass §3.1).
        type: Sequelize.JSONB,
        allowNull: true,
      },
      semester: {
        type: Sequelize.STRING,
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
    });

    console.log('Table siak_v2_classes created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('siak_v2_classes');
  },
};
