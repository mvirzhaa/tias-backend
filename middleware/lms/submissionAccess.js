const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const {
  lecturerOwns,
  studentIsEnrolled,
  resolveKelasFromContent,
} = require("./lecturerOwnsClass");
const LmsSection = require("../../models/lms/LmsSection");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const LmsSubmission = require("../../models/lms/LmsSubmission");

/**
 * Otorisasi Assignment/Submission (A5) — semua cek berbasis tabel LOKAL hasil sync SIAK v2.
 * Default DENY. kelasKuliahId SELALU diturunkan server-side:
 *
 *   - endpoint berbasis ITEM (/items/:id/submissions*) → resolveKelasFromContent (item→section→kelas)
 *   - endpoint berbasis SUBMISSION (/submissions/:submissionId*) → submission→item→section→kelas
 *
 * Otorisasi BERLAPIS:
 *   - submit / lihat submission sendiri = mahasiswa terdaftar (studentEnrolledContent)
 *   - lihat SEMUA submission / nilai     = dosen pengampu (lecturerOwnsContentSection — reuse)
 *   - lihat 1 submission / file          = dosen pengampu ATAU mahasiswa PEMILIK baris
 *     (IDOR-baris: siak_mahasiswa_id === req.user.siakUserUuid)
 */

const isLecturer = (req) =>
  req.user && (req.user.role === "Dosen" || req.user.role === "Dosen_Ext");

// Muat submission→item→section, kembalikan kelasKuliahId, atau undefined bila respons terkirim.
async function resolveKelasFromSubmission(req, res) {
  const submission = await LmsSubmission.findByPk(req.params.submissionId);
  if (!submission) {
    response(res, false, "Submission tidak ditemukan.", null, 404);
    return undefined;
  }
  req.lmsSubmission = submission;
  const item = await LmsContentItem.findByPk(submission.content_item_id);
  if (!item) {
    response(res, false, "Assignment tidak ditemukan.", null, 404);
    return undefined;
  }
  req.lmsContentItem = item;
  const section = await LmsSection.findByPk(item.section_id);
  if (!section) {
    response(res, false, "Section tidak ditemukan.", null, 404);
    return undefined;
  }
  req.lmsSection = section;
  return section.kelasKuliahId;
}

/**
 * Mahasiswa terdaftar pada kelas dari ITEM (submit / lihat punya sendiri). Item harus
 * bertipe assignment. Identitas mahasiswa = req.user.siakUserUuid (dipakai controller utk
 * memaksa kepemilikan baris — TIDAK pernah dari body).
 */
exports.studentEnrolledContent = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await resolveKelasFromContent(req, res);
  if (kelasKuliahId === undefined) return;

  if (req.lmsContentItem && req.lmsContentItem.type !== "assignment") {
    return response(res, false, "Item ini bukan assignment.", null, 400);
  }
  if (
    req.user &&
    req.user.role === "Mahasiswa" &&
    (await studentIsEnrolled(req, kelasKuliahId))
  ) {
    return next();
  }
  return response(res, false, "Anda tidak terdaftar di kelas ini.", null, 403);
});

/**
 * Akses 1 submission (lihat detail / unduh file): dosen pengampu/admin ATAU mahasiswa
 * PEMILIK baris. req.lmsSubmission & req.lmsContentItem dimuat resolver.
 * req.lmsIsLecturer menandai hak dosen (utk konteks, mis. lihat identitas mhs).
 */
exports.submissionViewAccess = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await resolveKelasFromSubmission(req, res);
  if (kelasKuliahId === undefined) return;

  if (req.user && req.user.role === "Admin") {
    req.lmsIsLecturer = true;
    return next();
  }
  if (isLecturer(req) && (await lecturerOwns(req, kelasKuliahId))) {
    req.lmsIsLecturer = true;
    return next();
  }
  // IDOR-baris: mahasiswa hanya boleh submission MILIKNYA (bukan sekadar anggota kelas).
  if (
    req.user &&
    req.user.role === "Mahasiswa" &&
    req.lmsSubmission.siak_mahasiswa_id === req.user.siakUserUuid
  ) {
    req.lmsIsLecturer = false;
    return next();
  }
  return response(res, false, "Anda tidak punya akses ke submission ini.", null, 403);
});

/**
 * Menilai submission: hanya dosen pengampu / admin. Asimetri sengaja: dosen BOLEH re-grade
 * berulang (tidak digerbang graded_at) — penguncian graded_at hanya berlaku utk resubmit mhs.
 */
exports.lecturerGradesSubmission = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await resolveKelasFromSubmission(req, res);
  if (kelasKuliahId === undefined) return;

  if (req.user && req.user.role === "Admin") {
    req.lmsLecturerId = req.user.user_id;
    return next();
  }
  if (isLecturer(req) && (await lecturerOwns(req, kelasKuliahId))) {
    req.lmsLecturerId = req.user.user_id;
    return next();
  }
  return response(res, false, "Akses ditolak: hanya dosen pengampu atau admin.", null, 403);
});

exports.resolveKelasFromSubmission = resolveKelasFromSubmission;
