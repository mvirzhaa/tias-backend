const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { listLmsClasses } = require("../../lib/lms/siakStagingBridgeService");
const SiakV2Participant = require("../../models/lms/SiakV2Participant");

exports.listClasses = asyncHandler(async (req, res) => {
  try {
    const result = await listLmsClasses({
      user: req.user,
      limit: req.query.limit,
      page: req.query.page,
      search: req.query.search,
      includeEmpty: req.query.include_empty === "true",
    });

    return response(res, true, "Success", result);
  } catch (error) {
    return response(res, false, `Gagal membaca kelas LMS: ${error.message}`, null, 502);
  }
});

// GET /lms/participants?kelasKuliahId= — roster kelas (dipakai FE utk dropdown "Komti Kelas"
// saat generate presensi). Dosen pengampu/admin only, lihat lecturerOwnsClass di route.
exports.listParticipants = asyncHandler(async (req, res) => {
  const { kelasKuliahId } = req.query;
  const rows = await SiakV2Participant.findAll({
    where: { kelasKuliahId },
    attributes: ["siak_mahasiswa_id", "npm", "nama"],
    order: [["nama", "ASC"]],
  });
  return response(res, true, "success", rows);
});
