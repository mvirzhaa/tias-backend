'use strict';

/**
 * Trim seed absensi/pembelajaran dari 16 pertemuan → 14 pertemuan per MK.
 * Idempotent: aman dijalankan berulang.
 */

const MATAKULIAH_KODES = ['IHK110', 'PAI111', 'PBI106X', 'TIF101', 'TIF103'];
const TOTAL_PERTEMUAN = 14;
const SEMESTER = '2025 Ganjil';

module.exports = {
  async up(queryInterface) {
    const mkRows = await queryInterface.sequelize.query(
      `SELECT id FROM m_matakuliah WHERE kode_matakuliah IN ('${MATAKULIAH_KODES.join("','")}')`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (mkRows.length === 0) {
      console.log('[Migration] m_matakuliah kosong, skip trim pertemuan.');
      return;
    }

    const idMatkuls = mkRows.map(r => r.id).join(',');

    const [absensiDeleted] = await queryInterface.sequelize.query(
      `DELETE FROM absensi_mhs WHERE id_pembelajaran IN (
         SELECT id FROM pembelajaran_dosen_ext
         WHERE id_matkul IN (${idMatkuls}) AND semester = '${SEMESTER}' AND pertemuan > ${TOTAL_PERTEMUAN}
       ) RETURNING id`
    );

    const [pembDeleted] = await queryInterface.sequelize.query(
      `DELETE FROM pembelajaran_dosen_ext
       WHERE id_matkul IN (${idMatkuls}) AND semester = '${SEMESTER}' AND pertemuan > ${TOTAL_PERTEMUAN}
       RETURNING id`
    );

    console.log(
      `[Migration] Trim pertemuan > ${TOTAL_PERTEMUAN}: ` +
      `${pembDeleted.length} pembelajaran, ${absensiDeleted.length} absensi dihapus.`
    );
  },

  async down() {
    // Tidak restore pertemuan 15-16; data seed tidak perlu di-rollback.
    console.log('[Migration] down: no-op (pertemuan 15-16 tidak di-restore).');
  },
};
