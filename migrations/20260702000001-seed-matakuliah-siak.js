'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.bulkInsert('m_matakuliah', [
      {
        kode_matakuliah: 'IHK110',
        nama_matakuliah: 'Pancasila',
        kurikulum: null,
        sks: 2,
        materi: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        kode_matakuliah: 'PAI111',
        nama_matakuliah: 'Studi Islam I',
        kurikulum: null,
        sks: 2,
        materi: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        kode_matakuliah: 'PBI106X',
        nama_matakuliah: 'Bahasa Indonesia',
        kurikulum: null,
        sks: 2,
        materi: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        kode_matakuliah: 'TIF101',
        nama_matakuliah: 'Pengantar Teknik Informatika',
        kurikulum: null,
        sks: 2,
        materi: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        kode_matakuliah: 'TIF103',
        nama_matakuliah: 'Matematika Diskrit',
        kurikulum: null,
        sks: 2,
        materi: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ], {
      // Lewati baris yang sudah ada berdasarkan kode_matakuliah
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('m_matakuliah', {
      kode_matakuliah: ['IHK110', 'PAI111', 'PBI106X', 'TIF101', 'TIF103'],
    }, {});
  },
};
