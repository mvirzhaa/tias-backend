const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const {
  lecturerOwns,
  studentIsEnrolled,
  userCanViewClassByScope,
} = require("./lecturerOwnsClass");
const LmsSection = require("../../models/lms/LmsSection");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const LmsForumThread = require("../../models/lms/LmsForumThread");
const LmsForumPost = require("../../models/lms/LmsForumPost");

/**
 * Otorisasi Forum (SPEC v6 §5.6) — semua cek berbasis tabel LOKAL hasil sinkron SIAK v2.
 * Default DENY (CLAUDE.md §6). Akses forum mengikuti keanggotaan KELAS induk:
 *
 *   forum item (params.id) → section → kelasKuliahId
 *   thread (params.threadId) → forum item → section → kelasKuliahId
 *   post   (params.postId)  → thread → forum item → section → kelasKuliahId
 *
 * forumMember     = admin | dosen pengampu | mahasiswa terdaftar (baca + ikut diskusi).
 * forumModerator  = admin | dosen pengampu (pin/lock thread).
 *
 * Entitas yang sudah dimuat dilampirkan ke req (lmsForumItem/lmsThread/lmsPost/lmsSection)
 * agar controller tak query ulang. req.lmsIsModerator menandai hak moderasi (dosen/admin).
 */

// Muat rantai entitas dari params, kembalikan kelasKuliahId — atau undefined bila respons
// (404/400) sudah dikirim.
async function loadForumContext(req, res) {
  let forumItemId;

  if (req.params && req.params.postId) {
    const post = await LmsForumPost.findByPk(req.params.postId);
    if (!post) {
      response(res, false, "Post tidak ditemukan.", null, 404);
      return undefined;
    }
    req.lmsPost = post;
    const thread = await LmsForumThread.findByPk(post.thread_id);
    if (!thread) {
      response(res, false, "Thread tidak ditemukan.", null, 404);
      return undefined;
    }
    req.lmsThread = thread;
    forumItemId = thread.content_item_id;
  } else if (req.params && req.params.threadId) {
    const thread = await LmsForumThread.findByPk(req.params.threadId);
    if (!thread) {
      response(res, false, "Thread tidak ditemukan.", null, 404);
      return undefined;
    }
    req.lmsThread = thread;
    forumItemId = thread.content_item_id;
  } else if (req.params && req.params.id) {
    forumItemId = req.params.id;
  } else {
    response(res, false, "Identitas forum/thread/post wajib ada di path.", null, 400);
    return undefined;
  }

  const item = await LmsContentItem.findByPk(forumItemId);
  if (!item) {
    response(res, false, "Forum tidak ditemukan.", null, 404);
    return undefined;
  }
  if (item.type !== "forum") {
    response(res, false, "Item ini bukan forum.", null, 400);
    return undefined;
  }
  req.lmsForumItem = item;

  const section = await LmsSection.findByPk(item.section_id);
  if (!section) {
    response(res, false, "Section tidak ditemukan.", null, 404);
    return undefined;
  }
  req.lmsSection = section;
  return section.kelasKuliahId;
}

const isLecturer = (req) =>
  req.user && (req.user.role === "Dosen" || req.user.role === "Dosen_Ext");

// Viewer forum: anggota kelas atau admin scope akademik. Dipakai untuk GET.
exports.forumViewer = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await loadForumContext(req, res);
  if (kelasKuliahId === undefined) return;

  if (req.user && req.user.role === "Admin") {
    req.lmsIsModerator = true;
    return next();
  }
  const scopedAdminAccess = await userCanViewClassByScope(req.user, kelasKuliahId);
  if (scopedAdminAccess.allowed) {
    req.lmsIsModerator = false;
    req.lmsRoleScope = scopedAdminAccess.scope;
    req.lmsClassScope = scopedAdminAccess.class_scope;
    return next();
  }
  if (isLecturer(req) && (await lecturerOwns(req, kelasKuliahId))) {
    req.lmsIsModerator = true;
    return next();
  }
  if (req.user && req.user.role === "Mahasiswa" && (await studentIsEnrolled(req, kelasKuliahId))) {
    req.lmsIsModerator = false;
    return next();
  }
  return response(res, false, "Anda tidak punya akses ke forum kelas ini.", null, 403);
});

// Anggota kelas (baca + ikut diskusi). Set req.lmsIsModerator utk kontrol moderasi.
exports.forumMember = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await loadForumContext(req, res);
  if (kelasKuliahId === undefined) return;

  if (req.user && req.user.role === "Admin") {
    req.lmsIsModerator = true;
    return next();
  }
  if (isLecturer(req) && (await lecturerOwns(req, kelasKuliahId))) {
    req.lmsIsModerator = true;
    return next();
  }
  if (req.user && req.user.role === "Mahasiswa" && (await studentIsEnrolled(req, kelasKuliahId))) {
    req.lmsIsModerator = false;
    return next();
  }
  return response(res, false, "Anda tidak punya akses ke forum kelas ini.", null, 403);
});

// Moderator forum (pin/lock): hanya dosen pengampu / admin.
exports.forumModerator = asyncHandler(async (req, res, next) => {
  const kelasKuliahId = await loadForumContext(req, res);
  if (kelasKuliahId === undefined) return;

  if (req.user && req.user.role === "Admin") {
    req.lmsIsModerator = true;
    return next();
  }
  if (isLecturer(req) && (await lecturerOwns(req, kelasKuliahId))) {
    req.lmsIsModerator = true;
    return next();
  }
  return response(res, false, "Akses ditolak: hanya dosen pengampu atau admin.", null, 403);
});

exports.loadForumContext = loadForumContext;
