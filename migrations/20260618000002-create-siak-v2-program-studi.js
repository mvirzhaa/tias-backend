'use strict';

/**
 * BRIEF v2 Task 3 — `siak_v2_program_studi`.
 *
 * Dimensi prodi untuk scope LMS (fakultas). Diisi pull-direct dari SIAK v2:
 *   - siakProgramStudiId / nama / jenjang  : dari `programStudi` yang ter-nest di
 *     payload kelas-kuliah (admin). TIDAK butuh master prodi.
 *   - siakFakultasId (NULLABLE)            : hanya terisi bila master prodi tersedia.
 *     Bila absen → fakultas null, scope fakultas DEGRADASI ke prodi-only.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('siak_v2_program_studi', {
      siakProgramStudiId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      siakFakultasId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      kode_prodi: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_prodi: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      jenjang: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('siak_v2_program_studi', ['siakFakultasId'], {
      name: 'idx_svps_fakultas',
    });

    console.log('Table siak_v2_program_studi created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('siak_v2_program_studi');
  },
};
