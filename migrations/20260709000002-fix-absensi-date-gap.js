'use strict';

/**
 * Perbaiki tanggal seed absensi: setiap pertemuan berjarak 1 minggu.
 * Jalankan jika migration 20260702000002 sudah pernah di-execute sebelumnya.
 */

const VALID_NPMS = [
  '221106042843', '221106042931', '221106042963', '221106042881', '221106043019',
  '221106042851', '221106042991', '221106042855', '221106042869', '221106042895',
  '221106042947', '221106042937',
];

const MATAKULIAH_KODES = ['IHK110', 'PAI111', 'PBI106X', 'TIF101', 'TIF103'];
const TOTAL_PERTEMUAN = 14;
const SEMESTER = '2025 Ganjil';
const SEMESTER_START = new Date('2025-08-04T08:00:00+07:00');

const getPertemuanDate = (matkulIndex, pertemuan) => {
  const date = new Date(SEMESTER_START);
  date.setDate(date.getDate() + matkulIndex + (pertemuan - 1) * 7);
  date.setHours(8, 0, 0, 0);
  return date;
};

module.exports = {
  async up(queryInterface) {
    const mkRows = await queryInterface.sequelize.query(
      `SELECT id, kode_matakuliah FROM m_matakuliah
       WHERE kode_matakuliah IN ('IHK110','PAI111','PBI106X','TIF101','TIF103') AND deleted_at IS NULL`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (mkRows.length === 0) {
      console.log('[Migration] m_matakuliah kosong, skip fix tanggal absensi.');
      return;
    }

    const mkIdMap = {};
    for (const row of mkRows) mkIdMap[row.kode_matakuliah] = row.id;

    const npmListStr = VALID_NPMS.map((n) => `'${n}'`).join(',');

    for (const [mkIdx, kode] of MATAKULIAH_KODES.entries()) {
      const matkulId = mkIdMap[kode];
      if (!matkulId) continue;

      for (let pert = 1; pert <= TOTAL_PERTEMUAN; pert++) {
        const meetingDate = getPertemuanDate(mkIdx, pert);

        const [pembRows] = await queryInterface.sequelize.query(
          `SELECT id FROM pembelajaran_dosen_ext
           WHERE id_matkul = :matkulId AND pertemuan = :pert AND semester = :semester
           LIMIT 1`,
          { replacements: { matkulId, pert, semester: SEMESTER } }
        );

        if (!pembRows.length) continue;
        const pembId = pembRows[0].id;

        await queryInterface.sequelize.query(
          `UPDATE pembelajaran_dosen_ext
           SET learning_done = :meetingDate, created_at = :meetingDate, updated_at = :meetingDate
           WHERE id = :pembId`,
          { replacements: { meetingDate, pembId } }
        );

        await queryInterface.sequelize.query(
          `UPDATE absensi_mhs
           SET created_at = :meetingDate, updated_at = :meetingDate
           WHERE id_pembelajaran = :pembId AND npm IN (${npmListStr})`,
          { replacements: { meetingDate, pembId } }
        );
      }
    }

    console.log('[Migration] ✅ Tanggal absensi diperbarui (gap 1 minggu per pertemuan).');
  },

  async down() {
    console.log('[Migration] Fix tanggal absensi — tidak ada rollback.');
  },
};
