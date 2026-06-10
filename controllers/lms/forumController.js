const asyncHandler = require("express-async-handler");
const db = require("../../config");
const { response } = require("../../lib/response");
const LmsForumThread = require("../../models/lms/LmsForumThread");
const LmsForumPost = require("../../models/lms/LmsForumPost");

/**
 * Forum MVP (SPEC v6 §5.6) — thread, reply 1-level, edit/hapus milik sendiri, pin/lock dosen.
 *
 * Otorisasi & pemuatan entitas dilakukan middleware forumAccess (forumMember/forumModerator):
 *   req.lmsForumItem · req.lmsThread · req.lmsPost · req.lmsIsModerator.
 * Identitas penulis SELALU dari JWT (req.user.user_id), TIDAK dari body. Default DENY.
 */

// Teks bebas user dirender di FE → buang tag HTML (cegah stored XSS) + batasi panjang.
const stripTags = (s) => String(s).replace(/<[^>]*>/g, "");
const cleanText = (s, max) => stripTags(s).trim().slice(0, max);

const authorId = (req) => req.user.user_id;
const isOwner = (req, row) => row.author_id === req.user.user_id;

// GET /lms/items/:id/threads  (forumMember) — pinned dulu, lalu terbaru.
exports.listThreads = asyncHandler(async (req, res) => {
  const threads = await LmsForumThread.findAll({
    where: { content_item_id: req.lmsForumItem.id },
    order: [
      ["is_pinned", "DESC"],
      ["created_at", "DESC"],
    ],
  });
  return response(res, true, "Success", threads);
});

// POST /lms/items/:id/threads  (forumMember) — body { title, body? }.
// Bila `body` diisi → buat thread + post pembuka dalam satu transaksi.
exports.createThread = asyncHandler(async (req, res) => {
  const title = cleanText(req.body.title || "", 255);
  if (!title) {
    return response(res, false, "title wajib diisi.", null, 400);
  }
  const openingBody =
    req.body.body != null ? cleanText(req.body.body, 20000) : null;
  if (req.body.body != null && !openingBody) {
    return response(res, false, "body tidak boleh kosong bila dikirim.", null, 400);
  }

  const now = new Date();
  const result = await db.transaction(async (t) => {
    const thread = await LmsForumThread.create(
      {
        content_item_id: req.lmsForumItem.id,
        author_id: authorId(req),
        title,
        created_at: now,
        updated_at: now,
      },
      { transaction: t }
    );
    let openingPost = null;
    if (openingBody) {
      openingPost = await LmsForumPost.create(
        {
          thread_id: thread.id,
          parent_post_id: null,
          author_id: authorId(req),
          body: openingBody,
          created_at: now,
          updated_at: now,
        },
        { transaction: t }
      );
    }
    return { thread, openingPost };
  });

  return response(res, true, "Thread berhasil dibuat.", result, 201);
});

// GET /lms/threads/:threadId  (forumMember) — thread + daftar post (kronologis).
exports.getThread = asyncHandler(async (req, res) => {
  const posts = await LmsForumPost.findAll({
    where: { thread_id: req.lmsThread.id },
    order: [["created_at", "ASC"]],
  });
  return response(res, true, "Success", { thread: req.lmsThread, posts });
});

// PATCH /lms/threads/:threadId  (forumModerator) — body { is_pinned?, is_locked? }.
exports.updateThreadFlags = asyncHandler(async (req, res) => {
  const { is_pinned, is_locked } = req.body;
  const updates = { updated_at: new Date() };
  if (is_pinned !== undefined) {
    updates.is_pinned = is_pinned === true || is_pinned === "true";
  }
  if (is_locked !== undefined) {
    updates.is_locked = is_locked === true || is_locked === "true";
  }
  if (updates.is_pinned === undefined && updates.is_locked === undefined) {
    return response(res, false, "Tidak ada perubahan (is_pinned/is_locked).", null, 400);
  }
  await req.lmsThread.update(updates);
  return response(res, true, "Thread diperbarui.", req.lmsThread);
});

// DELETE /lms/threads/:threadId  (forumMember) — penulis sendiri ATAU moderator. Soft delete.
exports.deleteThread = asyncHandler(async (req, res) => {
  if (!isOwner(req, req.lmsThread) && !req.lmsIsModerator) {
    return response(res, false, "Hanya pembuat thread atau dosen/admin yang bisa menghapus.", null, 403);
  }
  await req.lmsThread.update({ deleted_at: new Date() });
  return response(res, true, "Thread dihapus.", null);
});

// POST /lms/threads/:threadId/posts  (forumMember) — body { body, parent_post_id? }.
exports.createPost = asyncHandler(async (req, res) => {
  // Thread terkunci → hanya moderator yang masih boleh menulis.
  if (req.lmsThread.is_locked && !req.lmsIsModerator) {
    return response(res, false, "Thread dikunci; tidak menerima balasan baru.", null, 403);
  }

  const body = cleanText(req.body.body || "", 20000);
  if (!body) {
    return response(res, false, "body wajib diisi.", null, 400);
  }

  // Reply 1-level: parent (bila ada) harus post utama di thread yang sama.
  let parentPostId = null;
  if (req.body.parent_post_id != null && String(req.body.parent_post_id).trim() !== "") {
    const parent = await LmsForumPost.findOne({
      where: { id: req.body.parent_post_id, thread_id: req.lmsThread.id },
    });
    if (!parent) {
      return response(res, false, "Post induk tidak ditemukan di thread ini.", null, 400);
    }
    if (parent.parent_post_id != null) {
      return response(res, false, "Balasan maksimal 1 tingkat (tidak bisa membalas balasan).", null, 400);
    }
    parentPostId = parent.id;
  }

  const now = new Date();
  const post = await LmsForumPost.create({
    thread_id: req.lmsThread.id,
    parent_post_id: parentPostId,
    author_id: authorId(req),
    body,
    created_at: now,
    updated_at: now,
  });

  return response(res, true, "Balasan terkirim.", post, 201);
});

// PUT /lms/posts/:postId  (forumMember) — hanya penulis sendiri. body { body }.
exports.updatePost = asyncHandler(async (req, res) => {
  if (!isOwner(req, req.lmsPost)) {
    return response(res, false, "Anda hanya bisa mengedit post milik sendiri.", null, 403);
  }
  const body = cleanText(req.body.body || "", 20000);
  if (!body) {
    return response(res, false, "body wajib diisi.", null, 400);
  }
  await req.lmsPost.update({ body, edited: true, updated_at: new Date() });
  return response(res, true, "Post diperbarui.", req.lmsPost);
});

// DELETE /lms/posts/:postId  (forumMember) — penulis sendiri ATAU moderator. Soft delete.
exports.deletePost = asyncHandler(async (req, res) => {
  if (!isOwner(req, req.lmsPost) && !req.lmsIsModerator) {
    return response(res, false, "Hanya penulis post atau dosen/admin yang bisa menghapus.", null, 403);
  }
  await req.lmsPost.update({ deleted_at: new Date() });
  return response(res, true, "Post dihapus.", null);
});
