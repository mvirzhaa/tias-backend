const db = require("../../config");

/**
 * Rekap presensi gabungan: UNION legacy (pembelajaran_dosen_ext + absensi_mhs, sistem lama
 * yang TETAP jalan, tidak di-cutover) dengan baru (lms_attendance_sessions + records).
 *
 * Jembatan identitas: siak_user_mappings (tias_user_id <-> siak_user_uuid) — legacy pakai
 * tias_user_id (AbsensiMhs.id_mhs = tb_users.user_id), baru pakai siak_user_uuid
 * (siak_mahasiswa_id). Jembatan matkul: kode_matakuliah, ada di m_matakuliah (lama) &
 * siak_v2_classes (baru) — pola sama seperti dipakai lib/lms/siakStagingBridgeService.js.
 *
 * Query mentah (bukan ORM join lintas skema), mengikuti pola db.query + named replacements
 * yang sudah dipakai lib/lms/roleScopeService.js & siakStagingBridgeService.js.
 */
async function getRekapByClass({ kelasKuliahId }) {
  const [classRows] = await db.query(
    `SELECT kode_matakuliah, nama_matakuliah FROM siak_v2_classes WHERE "kelasKuliahId" = :kelasKuliahId`,
    { replacements: { kelasKuliahId } }
  );
  const kodeMatakuliah = classRows[0] ? classRows[0].kode_matakuliah : null;

  const [rows] = await db.query(
    `
    SELECT * FROM (
      SELECT
        sm.tias_user_id AS identity_id,
        tu.npm AS npm,
        dp.nama_lengkap AS nama,
        'legacy' AS source,
        p.pertemuan AS pertemuan_ke,
        CASE WHEN am.status_absen = 1 THEN 'hadir' ELSE 'tidak_hadir' END AS status,
        NULL::date AS tanggal,
        'legacy' AS metode
      FROM absensi_mhs am
      JOIN pembelajaran_dosen_ext p ON p.id = am.id_pembelajaran
      JOIN m_matakuliah mk ON mk.id = p.id_matkul
      JOIN siak_user_mappings sm ON sm.tias_user_id = am.id_mhs
      JOIN tb_users tu ON tu.user_id = sm.tias_user_id
      LEFT JOIN tb_data_pribadi dp ON dp.user_id = tu.user_id
      WHERE mk.kode_matakuliah = :kodeMatakuliah
        AND am.deleted_at IS NULL
        AND p.deleted_at IS NULL

      UNION ALL

      SELECT
        sm.tias_user_id AS identity_id,
        sp.npm AS npm,
        sp.nama AS nama,
        'lms' AS source,
        las.pertemuan_ke,
        lar.status,
        las.session_date AS tanggal,
        lar.metode
      FROM lms_attendance_records lar
      JOIN lms_attendance_sessions las ON las.id = lar.session_id
      JOIN siak_user_mappings sm ON sm.siak_user_uuid = lar.siak_mahasiswa_id
      LEFT JOIN siak_v2_participants sp
        ON sp."kelasKuliahId" = lar."kelasKuliahId" AND sp.siak_mahasiswa_id = lar.siak_mahasiswa_id
      WHERE lar."kelasKuliahId" = :kelasKuliahId
        AND lar.deleted_at IS NULL
    ) unioned
    ORDER BY npm ASC NULLS LAST, tanggal ASC NULLS LAST
    `,
    { replacements: { kelasKuliahId, kodeMatakuliah } }
  );

  const byMahasiswa = new Map();
  for (const row of rows) {
    const key = row.identity_id || row.npm;
    if (!byMahasiswa.has(key)) {
      byMahasiswa.set(key, { npm: row.npm, nama: row.nama, total_hadir: 0, records: [] });
    }
    const entry = byMahasiswa.get(key);
    if (row.status === "hadir") entry.total_hadir += 1;
    entry.records.push({
      source: row.source,
      pertemuan_ke: row.pertemuan_ke,
      status: row.status,
      tanggal: row.tanggal,
      metode: row.metode,
    });
  }

  return {
    kelasKuliahId,
    kode_matakuliah: kodeMatakuliah,
    mahasiswa: Array.from(byMahasiswa.values()),
  };
}

module.exports = { getRekapByClass };
