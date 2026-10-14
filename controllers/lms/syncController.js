const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const {
  syncSiakV2,
  syncProgramStudiFull,
  syncMataKuliahFull,
} = require("../../lib/lms/siakV2/syncService");

/**
 * POST /lms/sync-siak  (sumber: endpoint publik /api/public, tanpa auth)
 *
 * Menarik langsung dari SIAK v2 /api/public (kelas + matkul + jadwal + dosen + peserta
 * nested), upsert ke siak_v2_* (kelas/dosen/jadwal/peserta/prodi), lalu linking
 * siak_user_mappings. Mengembalikan reconciliation report (unmatched/conflict dosen
 * & mahasiswa) sebagai gate pra-cut-over.
 */
exports.syncSiak = asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    const result = await syncSiakV2({
      pageSize: body.pageSize || req.query.pageSize,
    });

    return response(res, true, "Sinkronisasi SIAK v2 (pull-direct) berhasil.", result);
  } catch (error) {
    return response(res, false, `Sinkronisasi SIAK v2 gagal: ${error.message}`, null, 502);
  }
});

/**
 * POST /lms/sync-program-studi  (sumber: endpoint publik /api/public/program-studi)
 *
 * Backfill LENGKAP master prodi (siak_v2_program_studi) langsung dari SIAK, independen
 * dari kelas — beda dengan sync-siak yang prodinya cuma ikutan prodi-prodi yang lagi
 * punya kelas berjalan. Dipakai supaya dropdown Prodi (mis. Master TA) mencakup semua
 * prodi, bukan cuma yang sedang ada kelasnya.
 */
exports.syncProgramStudi = asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    const result = await syncProgramStudiFull({
      pageSize: body.pageSize || req.query.pageSize,
    });

    return response(res, true, "Sinkronisasi master prodi SIAK berhasil.", result);
  } catch (error) {
    return response(res, false, `Sinkronisasi master prodi SIAK gagal: ${error.message}`, null, 502);
  }
});

/**
 * POST /lms/sync-mata-kuliah  (sumber: endpoint publik /api/public/mata-kuliah)
 *
 * Backfill LENGKAP master mata kuliah (siak_v2_mata_kuliah) langsung dari SIAK —
 * gantiin tabel lokal lama m_matakuliah yang sudah orphan (tidak pernah lagi di-sync
 * sejak migrasi v1 -> v2). Sumber tab "Matakuliah" di admin Pembelajaran.
 */
exports.syncMataKuliah = asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    const result = await syncMataKuliahFull({
      pageSize: body.pageSize || req.query.pageSize,
    });

    return response(res, true, "Sinkronisasi master mata kuliah SIAK berhasil.", result);
  } catch (error) {
    return response(res, false, `Sinkronisasi master mata kuliah SIAK gagal: ${error.message}`, null, 502);
  }
});
