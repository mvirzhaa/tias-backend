const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { lecturerOwns, studentIsEnrolled } = require("./lecturerOwnsClass");
const LmsAttendanceSession = require("../../models/lms/LmsAttendanceSession");
const LmsAttendanceRecord = require("../../models/lms/LmsAttendanceRecord");
const { isSessionActive } = require("../../lib/lms/attendanceMethod");

/**
 * Otorisasi presensi. Reuse langsung `lecturerOwns`/`studentIsEnrolled` dari
 * middleware/lms/lecturerOwnsClass.js (sumber tunggal pencocokan siakUserUuid ke
 * siak_v2_class_lecturers/siak_v2_participants) — TIDAK reimplementasi.
 *
 * Catatan: factory `makeOwnsMiddleware` di lecturerOwnsClass.js tidak diexport (hanya
 * instance jadinya, mis. `lecturerOwnsClass`), jadi cek "dosen mengampu kelas" di sini
 * ditulis langsung pakai helper boolean yang memang diexport.
 */

// Resolve sesi presensi dari token (mahasiswa scan/input token). Return kelasKuliahId,
// atau undefined bila resolver sudah mengirim respons.
const resolveKelasFromToken = async (req, res) => {
  const token = (req.body && req.body.token) || req.query.token;
  if (!token || String(token).trim() === "") {
    response(res, false, "Token presensi wajib diisi.", null, 400);
    return undefined;
  }
  const session = await LmsAttendanceSession.findOne({
    where: { token: String(token).trim() },
  });
  if (!isSessionActive(session)) {
    response(res, false, "Token tidak valid atau sesi presensi sudah ditutup.", null, 404);
    return undefined;
  }
  req.lmsAttendanceSession = session;
  return session.kelasKuliahId;
};

// Middleware: buka sesi presensi — dosen pengampu kelas (dari req.body.kelasKuliahId) / admin.
exports.lecturerOwnsClassForAttendance = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = req.body && req.body.kelasKuliahId;
  if (!kelasKuliahId || String(kelasKuliahId).trim() === "") {
    return response(res, false, "Parameter kelasKuliahId wajib diisi.", null, 400);
  }

  if (req.user && req.user.role === "Admin") return next();
  if (!req.user || (req.user.role !== "Dosen" && req.user.role !== "Dosen_Ext")) {
    return response(res, false, "Akses ditolak: hanya dosen pengampu atau admin.", null, 403);
  }
  if (await lecturerOwns(req, kelasKuliahId)) return next();
  return response(res, false, "Anda tidak mengampu kelas ini.", null, 403);
});

// Middleware: tutup sesi presensi — dosen pengampu kelas ASAL sesi (dari req.params.id) / admin.
exports.lecturerOwnsSession = asyncHandler(async (req, res, next) => {
  const session = await LmsAttendanceSession.findByPk(req.params.id);
  if (!session) {
    return response(res, false, "Sesi presensi tidak ditemukan.", null, 404);
  }
  req.lmsAttendanceSession = session;

  if (req.user && req.user.role === "Admin") return next();
  if (!req.user || (req.user.role !== "Dosen" && req.user.role !== "Dosen_Ext")) {
    return response(res, false, "Akses ditolak: hanya dosen pengampu atau admin.", null, 403);
  }
  if (await lecturerOwns(req, session.kelasKuliahId)) return next();
  return response(res, false, "Anda tidak mengampu kelas ini.", null, 403);
});

// Middleware: submit presensi — mahasiswa terdaftar, sesi masih terbuka, belum presensi.
exports.studentCanSubmitAttendance = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await resolveKelasFromToken(req, res);
  if (kelasKuliahId === undefined) return;

  if (!req.user || req.user.role !== "Mahasiswa") {
    return response(res, false, "Hanya mahasiswa yang dapat melakukan presensi.", null, 403);
  }
  if (!(await studentIsEnrolled(req, kelasKuliahId))) {
    return response(res, false, "Anda tidak terdaftar di kelas ini.", null, 403);
  }
  // Sesi aktif/belum expired sudah dipastikan oleh resolveKelasFromToken (isSessionActive)
  // di atas — tidak perlu cek status lagi di sini.

  const dup = await LmsAttendanceRecord.findOne({
    where: {
      session_id: req.lmsAttendanceSession.id,
      siak_mahasiswa_id: req.user.siakUserUuid,
    },
  });
  if (dup) {
    return response(res, false, "Anda sudah presensi pada sesi ini.", null, 409);
  }

  return next();
});

exports.resolveKelasFromToken = resolveKelasFromToken;
