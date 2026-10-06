const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { lecturerOwns } = require("./lecturerOwnsClass");

/**
 * Otorisasi fitur "Duplikat dari Kelas Lain" (lib/lms/contentDuplication.js). Arah PULL:
 * dosen kelas KOSONG (tujuan) yang memulai aksi, jadi yang diverifikasi di sini HANYA
 * kepemilikan kelas TUJUAN. Syarat kelas SUMBER ("mata kuliah sama") dicek terpisah di
 * assertSameMataKuliah (perlu query siak_v2_classes untuk dua kelas, dipanggil dari
 * controller) — dosen kelas sumber TIDAK perlu mengampu/terdaftar.
 */

const pick = (req, key) => (req.query[key] != null ? req.query[key] : req.body[key]);

exports.lecturerOwnsTargetForDuplication = asyncHandler(async (req, res, next) => {
  const targetKelasKuliahId = pick(req, "targetKelasKuliahId");
  if (!targetKelasKuliahId || String(targetKelasKuliahId).trim() === "") {
    return response(res, false, "Parameter targetKelasKuliahId wajib diisi.", null, 400);
  }
  req.duplicationTargetKelasKuliahId = String(targetKelasKuliahId);

  if (req.user && req.user.role === "Admin") {
    req.lmsLecturerId = req.user.user_id;
    return next();
  }
  if (!req.user || (req.user.role !== "Dosen" && req.user.role !== "Dosen_Ext")) {
    return response(res, false, "Akses ditolak: hanya dosen pengampu atau admin.", null, 403);
  }
  if (await lecturerOwns(req, req.duplicationTargetKelasKuliahId)) {
    req.lmsLecturerId = req.user.user_id;
    return next();
  }
  return response(res, false, "Anda tidak mengampu kelas tujuan ini.", null, 403);
});
