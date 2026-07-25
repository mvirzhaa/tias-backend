'use strict';

/**
 * Hapus baris duplikat di m_matakuliah (kode sama).
 * Simpan 1 baris per kode: yang paling banyak dipakai di pembelajaran_dosen_ext,
 * tie-breaker id terbesar (biasanya seed terbaru).
 */

module.exports = {
  async up(queryInterface) {
    const [dupBefore] = await queryInterface.sequelize.query(`
      SELECT kode_matakuliah, COUNT(*)::int AS cnt
      FROM m_matakuliah
      WHERE deleted_at IS NULL
      GROUP BY kode_matakuliah
      HAVING COUNT(*) > 1
      ORDER BY kode_matakuliah
    `);

    if (dupBefore.length === 0) {
      console.log('[Migration] Tidak ada duplikat m_matakuliah.');
      return;
    }

    console.log('[Migration] Duplikat sebelum cleanup:', dupBefore.length, 'kode');

    const [deletedActive] = await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT
          mk.id,
          mk.kode_matakuliah,
          ROW_NUMBER() OVER (
            PARTITION BY mk.kode_matakuliah
            ORDER BY
              (SELECT COUNT(*) FROM pembelajaran_dosen_ext p WHERE p.id_matkul = mk.id) DESC,
              mk.id DESC
          ) AS rn
        FROM m_matakuliah mk
        WHERE mk.deleted_at IS NULL
      )
      DELETE FROM m_matakuliah
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      RETURNING id, kode_matakuliah
    `);

    const [deletedSoft] = await queryInterface.sequelize.query(`
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

    const totalDeleted = deletedActive.length + deletedSoft.length;
    console.log(
      `[Migration] Cleanup m_matakuliah: ${deletedActive.length} duplikat aktif, ` +
      `${deletedSoft.length} soft-deleted orphan dihapus (total ${totalDeleted}).`
    );

    if (totalDeleted === 0 && dupBefore.length === 0) {
      console.log('[Migration] Tidak ada duplikat/soft-deleted orphan m_matakuliah.');
      return;
    }

    const [dupAfter] = await queryInterface.sequelize.query(`
      SELECT kode_matakuliah, COUNT(*)::int AS cnt
      FROM m_matakuliah
      WHERE deleted_at IS NULL
      GROUP BY kode_matakuliah
      HAVING COUNT(*) > 1
    `);

    if (dupAfter.length > 0) {
      throw new Error(`Masih ada duplikat m_matakuliah setelah cleanup: ${JSON.stringify(dupAfter)}`);
    }
  },

  async down() {
    console.log('[Migration] down: no-op (duplikat tidak di-restore).');
  },
};
