const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { syncSiakV2 } = require("../../lib/lms/siakV2/syncService");

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
