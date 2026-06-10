const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  lecturerOwnsClass,
  lecturerOwnsContentSection,
  classViewAccess,
  classViewContentAccess,
} = require("../../middleware/lms/lecturerOwnsClass");
const { syncSiak } = require("../../controllers/lms/syncController");
const { createUploadItem, serveFile } = require("../../controllers/lms/fileController");
const { lmsUpload } = require("../../middleware/lms/lmsUpload");
const {
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
} = require("../../controllers/lms/sectionController");
const {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
} = require("../../controllers/lms/contentItemController");
const { forumMember, forumModerator } = require("../../middleware/lms/forumAccess");
const {
  listThreads,
  createThread,
  getThread,
  updateThreadFlags,
  deleteThread,
  createPost,
  updatePost,
  deletePost,
} = require("../../controllers/lms/forumController");

const router = express.Router();

// --- Sinkronisasi SIAK v2 (FULL SYNC, admin) — SPEC v8 §4 ---
router.post("/sync-siak", protected, adminOnly, syncSiak);

/**
 * Modul Pembelajaran (LMS) — Fase 1: Sections & Content Items (CRUD + reorder).
 * Semua endpoint: `protected` (authMiddleware) + middleware konteks otorisasi.
 * Default DENY. Identitas dosen selalu dari JWT (req.user), tidak dari req.body.
 *
 * Catatan: SPEC menulis base `/api/lms`, namun router repo di-mount di root (App.js
 * `app.use(router)`), sehingga base aktual = `/lms` (konsisten dgn `/absensi` dll).
 *
 * Akses BACA mahasiswa (studentEnrolled) = Fase 2; di Fase 1 baca terbatas pengampu/Admin.
 */

// --- Sections --- (BACA: admin|dosen-pengampu|mhs-terdaftar; TULIS: dosen-pengampu|admin)
router.get("/sections", protected, classViewAccess, listSections);
router.post("/sections", protected, lecturerOwnsClass, createSection);
// reorder HARUS sebelum "/sections/:id" agar tidak tertangkap sebagai :id.
router.patch("/sections/reorder", protected, lecturerOwnsClass, reorderSections);
router.get("/sections/:id", protected, classViewAccess, getSection);
router.put("/sections/:id", protected, lecturerOwnsClass, updateSection);
router.delete("/sections/:id", protected, lecturerOwnsClass, deleteSection);

// --- Content Items (di bawah section induk) ---
router.get(
  "/sections/:sectionId/items",
  protected,
  classViewContentAccess,
  listItems
);
router.post(
  "/sections/:sectionId/items",
  protected,
  lecturerOwnsContentSection,
  createItem
);
// Upload file (pdf; ppt menyusul) — file disimpan via storage layer, payload server-side.
router.post(
  "/sections/:sectionId/items/upload",
  protected,
  lecturerOwnsContentSection,
  lmsUpload,
  createUploadItem
);
router.patch(
  "/sections/:sectionId/items/reorder",
  protected,
  lecturerOwnsContentSection,
  reorderItems
);
router.get("/items/:id", protected, classViewContentAccess, getItem);
router.put("/items/:id", protected, lecturerOwnsContentSection, updateItem);
router.delete("/items/:id", protected, lecturerOwnsContentSection, deleteItem);

// --- Serve file berotorisasi (stream, BUKAN redirect ke URL publik) ---
router.get("/files/:id", protected, classViewContentAccess, serveFile);

// --- Forum (Fase 5) — content item bertipe `forum`. Otorisasi via keanggotaan kelas.
//     forumMember = admin|dosen-pengampu|mhs-terdaftar; forumModerator = dosen-pengampu|admin.
// Threads di bawah forum item (:id = id content item tipe forum).
router.get("/items/:id/threads", protected, forumMember, listThreads);
router.post("/items/:id/threads", protected, forumMember, createThread);
// Thread tunggal & moderasi.
router.get("/threads/:threadId", protected, forumMember, getThread);
router.patch("/threads/:threadId", protected, forumModerator, updateThreadFlags); // pin/lock
router.delete("/threads/:threadId", protected, forumMember, deleteThread); // pemilik/moderator
// Posts (balasan, reply 1-level).
router.post("/threads/:threadId/posts", protected, forumMember, createPost);
router.put("/posts/:postId", protected, forumMember, updatePost); // milik sendiri
router.delete("/posts/:postId", protected, forumMember, deletePost); // pemilik/moderator

module.exports = router;
