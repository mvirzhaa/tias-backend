'use strict';

/**
 * Hard-delete baris m_matakuliah soft-deleted yang sudah digantikan
 * baris aktif dengan kode sama (orphan dari seed lama).
 */

module.exports = {
  async up(queryInterface) {
    const [deleted] = await queryInterface.sequelize.query(`
      DELETE FROM m_matakuliah mk
      WHERE mk.deleted_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM pembelajaran_dosen_ext p WHERE p.id_matkul = mk.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM matakuliah_siak_mapping m WHERE m.matakuliah_id = mk.id
        )
        AND EXISTS (
          SELECT 1 FROM m_matakuliah active
          WHERE active.kode_matakuliah = mk.kode_matakuliah
            AND active.deleted_at IS NULL
            AND active.id <> mk.id
        )
      RETURNING id, kode_matakuliah
    `);

    console.log(`[Migration] ${deleted.length} soft-deleted orphan m_matakuliah dihapus.`);
  },

  async down() {
    console.log('[Migration] down: no-op (soft-deleted orphan tidak di-restore).');
  },
};
