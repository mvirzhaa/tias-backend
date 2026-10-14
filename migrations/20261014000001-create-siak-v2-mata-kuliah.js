'use strict';

/**
 * siak_v2_mata_kuliah — master mata kuliah dari SIAK v2 (pull-direct, endpoint publik
 * /api/public/mata-kuliah), dipakai gantiin tabel lokal lama `m_matakuliah` yang sudah
 * tidak pernah lagi di-sync sejak migrasi SIAK v1 -> v2 (jalur sync v1 dimatikan, lihat
 * lib/lms/siakV2/syncService.js). kurikulum disimpan sbg label teks (tahunKurikulum.tahun
 * dari SIAK), bukan FK ke tabel kurikulum lokal -- konsisten dgn pola denormalisasi
 * siak_v2_program_studi (nama_fakultas/nama_prodi).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('siak_v2_mata_kuliah', {
      siakMataKuliahId: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      siakProgramStudiId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      kode_matakuliah: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_matakuliah: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sks: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      kurikulum: {
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

    await queryInterface.addIndex('siak_v2_mata_kuliah', ['siakProgramStudiId'], {
      name: 'idx_svmk_program_studi',
    });

    console.log('Table siak_v2_mata_kuliah created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('siak_v2_mata_kuliah');
  },
};
