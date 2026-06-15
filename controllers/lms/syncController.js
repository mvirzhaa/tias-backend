const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const {
  syncLmsClassTablesFromStaging,
} = require("../../lib/lms/siakStagingBridgeService");

/**
 * POST /lms/sync-siak
 *
 * LMS tidak lagi menarik mock/direct SIAK sendiri. Sumber kelas dan peserta LMS
 * diproyeksikan dari staging SIAK baru (`siak_sync_*`) yang sudah melewati proses
 * sync, validasi, dan mapping awal.
 */
async function syncSiakV2Data(options = {}) {
  return syncLmsClassTablesFromStaging(options);
}

exports.syncSiak = asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    const result = await syncSiakV2Data({
      semester: body.semester || req.query.semester,
    });

    return response(res, true, "Sinkronisasi kelas LMS dari staging SIAK berhasil.", result);
  } catch (error) {
    return response(res, false, `Sinkronisasi kelas LMS gagal: ${error.message}`, null, 502);
  }
});

exports.syncSiakV2Data = syncSiakV2Data;
