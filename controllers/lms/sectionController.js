const asyncHandler = require("express-async-handler");
const db = require("../../config");
const { response } = require("../../lib/response");
const LmsSection = require("../../models/lms/LmsSection");
const LmsContentItem = require("../../models/lms/LmsContentItem");

/**
 * SPEC v6 §4 — Sections CRUD + reorder (CABANG MATI).
 * Tulis dilindungi `lecturerOwnsClass` (req.lmsLecturerId & req.lmsSection sudah diisi
 * middleware). Identitas dosen TIDAK pernah diambil dari req.body.
 */

const pick = (req, key) =>
  req.query[key] != null ? req.query[key] : req.body[key];

// GET /lms/sections?kelasKuliahId=
exports.listSections = asyncHandler(async (req, res) => {
  const { kelasKuliahId } = req.query;

  if (!kelasKuliahId) {
    return response(res, false, "kelasKuliahId wajib diisi.", null, 400);
  }

  const sections = await LmsSection.findAll({
    where: { kelasKuliahId },
    order: [
      ["position", "ASC"],
      ["pertemuan", "ASC"],
    ],
    include: [
      {
        model: LmsContentItem,
        as: "content_items",
        required: false,
        separate: true,
        order: [["position", "ASC"]],
      },
    ],
  });

  return response(res, true, "Success", sections);
});

// GET /lms/sections/:id  (middleware sudah memuat req.lmsSection)
exports.getSection = asyncHandler(async (req, res) => {
  const section = await LmsSection.findByPk(req.params.id, {
    include: [
      {
        model: LmsContentItem,
        as: "content_items",
        required: false,
        separate: true,
        order: [["position", "ASC"]],
      },
    ],
  });

  if (!section) {
    return response(res, false, "Section tidak ditemukan.", null, 404);
  }

  return response(res, true, "Success", section);
});

// POST /lms/sections?kelasKuliahId=&pertemuan=
exports.createSection = asyncHandler(async (req, res) => {
  const kelasKuliahId = pick(req, "kelasKuliahId");
  const pertemuan = pick(req, "pertemuan");
  const { title, description, position, is_published, available_from } = req.body;

  if (!kelasKuliahId || pertemuan == null) {
    return response(
      res,
      false,
      "kelasKuliahId, pertemuan wajib diisi.",
      null,
      400
    );
  }
  if (!title || String(title).trim() === "") {
    return response(res, false, "title wajib diisi.", null, 400);
  }

  const now = new Date();
  const section = await LmsSection.create({
    kelasKuliahId: String(kelasKuliahId),
    pertemuan: parseInt(pertemuan, 10),
    id_lecture: req.lmsLecturerId, // = user_id dosen, dari JWT via middleware
    title,
    description: description ?? null,
    position: position != null ? parseInt(position, 10) : 0,
    is_published: is_published === true || is_published === "true",
    available_from: available_from ?? null,
    created_at: now,
    updated_at: now,
  });

  return response(res, true, "Section berhasil dibuat.", section, 201);
});

// PUT /lms/sections/:id  (middleware sudah memverifikasi kepemilikan & memuat req.lmsSection)
exports.updateSection = asyncHandler(async (req, res) => {
  const section = req.lmsSection;
  const { title, description, position, is_published, available_from, pertemuan } =
    req.body;

  // Hanya field konten yang boleh diubah. Identitas kelas (kelasKuliahId/semester)
  // & kepemilikan (id_lecture) TIDAK diubah lewat endpoint ini.
  const updates = { updated_at: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (position !== undefined) updates.position = parseInt(position, 10);
  if (is_published !== undefined)
    updates.is_published = is_published === true || is_published === "true";
  if (available_from !== undefined) updates.available_from = available_from;
  if (pertemuan !== undefined) updates.pertemuan = parseInt(pertemuan, 10);

  await section.update(updates);

  return response(res, true, "Section berhasil diperbarui.", section);
});

// DELETE /lms/sections/:id  (soft delete, konvensi repo)
exports.deleteSection = asyncHandler(async (req, res) => {
  const section = req.lmsSection;

  await section.update({ deleted_at: new Date() });
  // Ikut soft-delete konten anak agar tidak yatim.
  await LmsContentItem.update(
    { deleted_at: new Date() },
    { where: { section_id: section.id, deleted_at: null } }
  );

  return response(res, true, "Section berhasil dihapus.", null);
});

// PATCH /lms/sections/reorder  body: { kelasKuliahId, items:[{id,position}] }
exports.reorderSections = asyncHandler(async (req, res) => {
  const kelasKuliahId = pick(req, "kelasKuliahId");
  const { items } = req.body;

  if (!kelasKuliahId) {
    return response(res, false, "kelasKuliahId wajib diisi.", null, 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    return response(res, false, "items[] wajib diisi.", null, 400);
  }

  // Scoping ke kelas yang sudah diverifikasi middleware → id section milik kelas lain diabaikan.
  await db.transaction(async (t) => {
    for (const it of items) {
      if (!it || it.id == null || it.position == null) continue;
      await LmsSection.update(
        { position: parseInt(it.position, 10), updated_at: new Date() },
        {
          where: { id: it.id, kelasKuliahId },
          transaction: t,
        }
      );
    }
  });

  return response(res, true, "Urutan section diperbarui.", null);
});
