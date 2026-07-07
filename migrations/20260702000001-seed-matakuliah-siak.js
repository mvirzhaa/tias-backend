'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const rows = [
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
    ];

    const kodes = rows.map((r) => `'${r.kode_matakuliah}'`).join(',');
    const existing = await queryInterface.sequelize.query(
      `SELECT kode_matakuliah FROM m_matakuliah WHERE kode_matakuliah IN (${kodes}) AND deleted_at IS NULL`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingSet = new Set(existing.map((r) => r.kode_matakuliah));
    const toInsert = rows.filter((r) => !existingSet.has(r.kode_matakuliah));

    if (toInsert.length === 0) {
      console.log('[Migration] Semua matakuliah SIAK sudah ada, skip insert.');
      return;
    }

    await queryInterface.bulkInsert('m_matakuliah', toInsert);
    console.log(`[Migration] ${toInsert.length} matakuliah SIAK di-insert.`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('m_matakuliah', {
      kode_matakuliah: ['IHK110', 'PAI111', 'PBI106X', 'TIF101', 'TIF103'],
    }, {});
  },
};
