const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { syncSiakV2, syncProgramStudiFull } = require("../../lib/lms/siakV2/syncService");

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
