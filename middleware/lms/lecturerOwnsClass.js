const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const LmsSection = require("../../models/lms/LmsSection");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const SiakV2ClassLecturer = require("../../models/lms/SiakV2ClassLecturer");
const SiakV2Participant = require("../../models/lms/SiakV2Participant");

/**
 * Otorisasi LMS. SEMUA pengecekan membaca tabel LOKAL
 * (siak_v2_class_lecturers / siak_v2_participants) hasil sync SIAK v2.
 * TIDAK ada panggilan SIAK live. Default DENY.
 *
 * IDENTITAS (BRIEF v2 Task 4 & 5 — berbasis UUID, BUKAN nama/nip):
 *   - id_lecture = req.user.user_id (UUID) → kepemilikan konten; dilampirkan ke req.lmsLecturerId.
 *   - dosen dicocokkan via req.user.siakUserUuid == siak_v2_class_lecturers.siak_dosen_id.
 *   - mahasiswa dicocokkan via req.user.siakUserUuid == siak_v2_participants.siak_mahasiswa_id.
 * req.user.siakUserUuid di-resolve dari siak_user_mappings saat login (authMiddleware).
 */

// ---- Resolver konteks kelasKuliahId (mengisi req.lmsSection / req.lmsContentItem) ----

// Untuk endpoint berbasis SECTION. Return kelasKuliahId, atau undefined bila sudah kirim respons.
const resolveKelasFromSection = async (req, res) => {
  if (req.params && req.params.id) {
    const section = await LmsSection.findByPk(req.params.id);
    if (!section) {
      response(res, false, "Section tidak ditemukan.", null, 404);
      return undefined;
    }
    req.lmsSection = section;
    return section.kelasKuliahId;
  }
  const k =
    req.query.kelasKuliahId != null ? req.query.kelasKuliahId : req.body.kelasKuliahId;
  if (!k || String(k).trim() === "") {
    response(res, false, "Parameter kelasKuliahId wajib diisi.", null, 400);
    return undefined;
  }
  return k;
};

// Untuk endpoint berbasis CONTENT ITEM. Return kelasKuliahId, atau undefined bila sudah kirim respons.
const resolveKelasFromContent = async (req, res) => {
  let sectionId;
  if (req.params && req.params.sectionId) {
    sectionId = req.params.sectionId;
  } else if (req.params && req.params.id) {
    const item = await LmsContentItem.findByPk(req.params.id);
    if (!item) {
      response(res, false, "Item tidak ditemukan.", null, 404);
      return undefined;
    }
    req.lmsContentItem = item;
    sectionId = item.section_id;
  } else {
    sectionId = req.body.section_id;
  }
  if (!sectionId) {
    response(res, false, "section_id wajib diisi.", null, 400);
    return undefined;
  }
  const section = await LmsSection.findByPk(sectionId);
  if (!section) {
    response(res, false, "Section tidak ditemukan.", null, 404);
    return undefined;
  }
  req.lmsSection = section;
  return section.kelasKuliahId;
};

// ---- Cek boolean murni (tanpa efek samping respons) ----

// Dosen login mengampu kelas? (siakUserUuid == siak_v2_class_lecturers.siak_dosen_id)
// Co-teaching otomatis didukung (banyak baris dosen per kelas).
const lecturerOwns = async (req, kelasKuliahId) => {
  const siakUserUuid = req.user && req.user.siakUserUuid;
  if (!siakUserUuid) return false;
  const found = await SiakV2ClassLecturer.findOne({
    where: { kelasKuliahId, siak_dosen_id: siakUserUuid },
    attributes: ["id"],
  });
  return !!found;
};

// Mahasiswa login terdaftar di kelas? (siakUserUuid == siak_v2_participants.siak_mahasiswa_id)
const studentIsEnrolled = async (req, kelasKuliahId) => {
  const siakUserUuid = req.user && req.user.siakUserUuid;
  if (!siakUserUuid) return false;
  const found = await SiakV2Participant.findOne({
    where: { kelasKuliahId, siak_mahasiswa_id: siakUserUuid },
    attributes: ["id"],
  });
  return !!found;
};

// ---- Middleware: TULIS (dosen pengampu / admin) ----

const makeOwnsMiddleware = (resolver) =>
  asyncHandler(async (req, res, next) => {
    const kelasKuliahId = await resolver(req, res);
    if (kelasKuliahId === undefined) return; // respons sudah dikirim resolver

    // Admin: bypass.
    if (req.user && req.user.role === "Admin") {
      req.lmsLecturerId = req.user.user_id;
      return next();
    }
    // Hanya Dosen / Dosen_Ext.
    if (!req.user || (req.user.role !== "Dosen" && req.user.role !== "Dosen_Ext")) {
      return response(res, false, "Akses ditolak: hanya dosen pengampu atau admin.", null, 403);
    }
    if (await lecturerOwns(req, kelasKuliahId)) {
      req.lmsLecturerId = req.user.user_id; // = id_lecture (kepemilikan konten)
      return next();
    }
    return response(res, false, "Anda tidak mengampu kelas ini.", null, 403);
  });

exports.lecturerOwnsClass = makeOwnsMiddleware(resolveKelasFromSection);
exports.lecturerOwnsContentSection = makeOwnsMiddleware(resolveKelasFromContent);

// ---- Middleware: BACA (admin | dosen pengampu | mahasiswa terdaftar) ----

const makeViewMiddleware = (resolver) =>
  asyncHandler(async (req, res, next) => {
    const kelasKuliahId = await resolver(req, res);
    if (kelasKuliahId === undefined) return;

    if (req.user && req.user.role === "Admin") return next();

    if (req.user && (req.user.role === "Dosen" || req.user.role === "Dosen_Ext")) {
      if (await lecturerOwns(req, kelasKuliahId)) {
        req.lmsLecturerId = req.user.user_id;
        return next();
      }
    }
    if (req.user && req.user.role === "Mahasiswa") {
      if (await studentIsEnrolled(req, kelasKuliahId)) return next();
    }
    return response(res, false, "Anda tidak punya akses ke kelas ini.", null, 403);
  });

exports.classViewAccess = makeViewMiddleware(resolveKelasFromSection);
exports.classViewContentAccess = makeViewMiddleware(resolveKelasFromContent);

// ---- Middleware: studentEnrolled murni (mahasiswa terdaftar / admin) ----

// Helper boolean dipakai ulang middleware lain (mis. forumAccess) — sumber tunggal
// pencocokan identitas dosen & mahasiswa (via siakUserUuid) ke tabel SIAK v2 lokal.
exports.lecturerOwns = lecturerOwns;
exports.studentIsEnrolled = studentIsEnrolled;
exports.userCanViewClassByScope = userCanViewClassByScope;
// Resolver konteks dipakai ulang modul lain (mis. submissionAccess) — sumber tunggal
// penurunan kelasKuliahId server-side (item → section → kelas).
exports.resolveKelasFromContent = resolveKelasFromContent;

exports.studentEnrolled = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await resolveKelasFromSection(req, res);
  if (kelasKuliahId === undefined) return;

  if (req.user && req.user.role === "Admin") return next();
  if (req.user && req.user.role === "Mahasiswa" && (await studentIsEnrolled(req, kelasKuliahId))) {
    return next();
  }
  return response(res, false, "Anda tidak terdaftar di kelas ini.", null, 403);
});
