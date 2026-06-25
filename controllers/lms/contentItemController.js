const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const db = require("../../config");
const { response } = require("../../lib/response");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const LmsSubmission = require("../../models/lms/LmsSubmission");
const { validateContentPayload, FILE_TYPES } = require("../../lib/lms/payloadValidators");

// Recompute is_late submission (cache) saat due_at assignment diedit — tutup celah deadline
// diperpanjang tapi baris lama tetap "telat". Sumber kebenaran tetap dihitung saat baca.
async function recomputeIsLate(contentItemId, dueAt) {
  const now = new Date();
  if (dueAt) {
    await LmsSubmission.update(
      { is_late: true, updated_at: now },
      { where: { content_item_id: contentItemId, submitted_at: { [Op.gt]: dueAt } } }
    );
    await LmsSubmission.update(
      { is_late: false, updated_at: now },
      { where: { content_item_id: contentItemId, submitted_at: { [Op.lte]: dueAt } } }
    );
  } else {
    await LmsSubmission.update(
      { is_late: false, updated_at: now },
      { where: { content_item_id: contentItemId } }
    );
  }
}

// Deskripsi item = teks polos opsional. Buang tag HTML & batasi panjang (defense-in-depth).
const cleanDescription = (value) => {
  if (value == null) return null;
  const text = String(value).replace(/<[^>]*>/g, "").trim();
  return text === "" ? null : text.slice(0, 2000);
};

/**
 * SPEC v8 §5 — Items CRUD + reorder. Tulis dilindungi `lecturerOwnsContentSection`
 * (req.lmsSection sudah diverifikasi & dimuat middleware).
 *
 * Validasi/sanitasi payload per-tipe dikerjakan bertahap di `lib/lms/payloadValidators.js`.
 * Tipe yang belum punya validator → payload dilewatkan apa adanya (akan menyusul per fase).
 * Status validator: [page, url, video] ✓.
 */

// GET /lms/sections/:sectionId/items
exports.listItems = asyncHandler(async (req, res) => {
  const items = await LmsContentItem.findAll({
    where: { section_id: req.params.sectionId },
    order: [["position", "ASC"]],
  });

  return response(res, true, "Success", items);
});

// GET /lms/items/:id  (middleware memuat req.lmsContentItem)
exports.getItem = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem || (await LmsContentItem.findByPk(req.params.id));
  if (!item) {
    return response(res, false, "Item tidak ditemukan.", null, 404);
  }
  return response(res, true, "Success", item);
});

// POST /lms/sections/:sectionId/items
exports.createItem = asyncHandler(async (req, res) => {
  const { type, title, position, is_published, payload } = req.body;

  if (!type || !LmsContentItem.CONTENT_TYPES.includes(type)) {
    return response(
      res,
      false,
      `type tidak valid. Pilihan: ${LmsContentItem.CONTENT_TYPES.join(", ")}.`,
      null,
      400
    );
  }
  if (!title || String(title).trim() === "") {
    return response(res, false, "title wajib diisi.", null, 400);
  }
  // Tipe file harus lewat endpoint upload (bukan JSON) — cegah set storage_key sembarang.
  if (FILE_TYPES.includes(type)) {
    return response(
      res,
      false,
      `Tipe '${type}' dibuat lewat POST /lms/sections/:sectionId/items/upload.`,
      null,
      400
    );
  }

  // Validasi + sanitasi payload sesuai skema tipe (tolak bila tidak sesuai).
  const validation = validateContentPayload(type, payload);
  if (!validation.ok) {
    return response(res, false, validation.error, null, 400);
  }

  const now = new Date();
  const item = await LmsContentItem.create({
    section_id: req.lmsSection.id, // dari middleware (terverifikasi)
    type,
    title,
    position: position != null ? parseInt(position, 10) : 0,
    is_published: is_published === true || is_published === "true",
    payload: validation.payload,
    created_at: now,
    updated_at: now,
  });

  return response(res, true, "Item berhasil dibuat.", item, 201);
});

// PUT /lms/items/:id
exports.updateItem = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem;
  const { type, title, position, is_published, payload } = req.body;

  const updates = { updated_at: new Date() };
  if (type !== undefined) {
    if (!LmsContentItem.CONTENT_TYPES.includes(type)) {
      return response(res, false, "type tidak valid.", null, 400);
    }
    if (FILE_TYPES.includes(type)) {
      return response(res, false, `Tidak bisa mengubah type menjadi '${type}' lewat JSON; pakai endpoint upload.`, null, 400);
    }
    updates.type = type;
  }
  if (title !== undefined) updates.title = title;
  if (position !== undefined) updates.position = parseInt(position, 10);
  if (is_published !== undefined)
    updates.is_published = is_published === true || is_published === "true";

  // Bila payload diubah, validasi terhadap tipe efektif (tipe baru bila diubah, else tipe lama).
  if (payload !== undefined) {
    const effectiveType = type !== undefined ? type : item.type;
    // File payload (storage_key dll) hanya boleh diatur server-side lewat upload, bukan JSON.
    if (FILE_TYPES.includes(effectiveType)) {
      return response(res, false, `Payload tipe '${effectiveType}' diubah lewat endpoint upload, bukan JSON.`, null, 400);
    }
    const validation = validateContentPayload(effectiveType, payload);
    if (!validation.ok) {
      return response(res, false, validation.error, null, 400);
    }
    updates.payload = validation.payload;
  }

  await item.update(updates);

  // Assignment: bila due_at berubah, segarkan cache is_late submission terkait.
  if (item.type === "assignment" && updates.payload !== undefined) {
    await recomputeIsLate(item.id, updates.payload.due_at || null);
  }

  return response(res, true, "Item berhasil diperbarui.", item);
});

// DELETE /lms/items/:id  (soft delete)
exports.deleteItem = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem;
  const now = new Date();
  await item.update({ deleted_at: now });
  // Assignment: ikut soft-delete submission anak (file fisik tetap; cleanup terpisah).
  if (item.type === "assignment") {
    await LmsSubmission.update(
      { deleted_at: now, updated_at: now },
      { where: { content_item_id: item.id, deleted_at: null } }
    );
  }
  return response(res, true, "Item berhasil dihapus.", null);
});

// PATCH /lms/sections/:sectionId/items/reorder  body: { items:[{id,position}] }
exports.reorderItems = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const sectionId = req.params.sectionId;

  if (!Array.isArray(items) || items.length === 0) {
    return response(res, false, "items[] wajib diisi.", null, 400);
  }

  // Scoping ke section terverifikasi → id item milik section lain diabaikan.
  await db.transaction(async (t) => {
    for (const it of items) {
      if (!it || it.id == null || it.position == null) continue;
      await LmsContentItem.update(
        { position: parseInt(it.position, 10), updated_at: new Date() },
        {
          where: { id: it.id, section_id: sectionId },
          transaction: t,
        }
      );
    }
  });

  return response(res, true, "Urutan item diperbarui.", null);
});
