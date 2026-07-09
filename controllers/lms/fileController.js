const asyncHandler = require("express-async-handler");
const path = require("path");
const { response } = require("../../lib/response");
const storage = require("../../lib/lms/storage");
const { matchesType, pptVariant } = require("../../lib/lms/fileType");
const LmsContentItem = require("../../models/lms/LmsContentItem");

/**
 * Upload & serve file LMS (SPEC v8 §5; reusable utk PPT & Assignment nanti).
 *
 * Alur AMAN:
 *  - MIME diverifikasi via MAGIC BYTES (bukan ekstensi/mimetype klien).
 *  - Nama file server-side (UUID) lewat layer storage; nama klien hanya disimpan utk display.
 *  - File di folder non-publik; akses HANYA via GET /lms/files/:id (authMiddleware +
 *    classViewContentAccess) → di-STREAM, tidak pernah redirect ke URL publik. Default DENY.
 *
 * payload (pdf/ppt): { storage_key, file_name, size, mime } — TANPA path publik.
 */

// Tipe berbasis upload. Kunci harus konsisten dgn FILE_TYPES di payloadValidators.js.
// ppt punya dua varian (pptx OOXML / ppt lama OLE) → ext+mime ditentukan dari isi file.
const PPT_VARIANTS = {
  pptx: {
    ext: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  ppt: { ext: "ppt", mime: "application/vnd.ms-powerpoint" },
};

const SUPPORTED_UPLOAD_TYPES = ["pdf", "ppt"];

/**
 * Verifikasi isi file & tentukan { ext, mime } untuk tipe yang diklaim, atau null bila
 * isi file tidak cocok (magic bytes salah). Penamaan/penyimpanan tetap server-side.
 */
function resolveUploadFormat(type, buffer) {
  if (type === "pdf") {
    return matchesType(buffer, "pdf") ? { ext: "pdf", mime: "application/pdf" } : null;
  }
  if (type === "ppt") {
    const variant = pptVariant(buffer);
    return variant ? PPT_VARIANTS[variant] : null;
  }
  return null;
}

// Bersihkan nama file klien (display only): buang segmen path, batasi panjang & karakter.
function sanitizeFileName(name) {
  const base = path.basename(String(name || "")).replace(/[^\w.\- ]/g, "_");
  return base.slice(0, 200) || "file";
}

// POST /lms/sections/:sectionId/items/upload  (protected + lecturerOwnsContentSection + lmsUpload)
exports.createUploadItem = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return response(res, false, "File wajib diunggah (field 'file').", null, 400);
  }

  const { type, title, description, is_published, position } = req.body;
  if (!SUPPORTED_UPLOAD_TYPES.includes(type)) {
    return response(
      res,
      false,
      `Tipe upload tidak didukung. Saat ini: ${SUPPORTED_UPLOAD_TYPES.join(", ")}.`,
      null,
      400
    );
  }
  if (!title || String(title).trim() === "") {
    return response(res, false, "title wajib diisi.", null, 400);
  }

  // Validasi MIME SEBENARNYA via magic bytes; sekaligus tentukan ext/mime (varian ppt).
  const cfg = resolveUploadFormat(type, file.buffer);
  if (!cfg) {
    return response(
      res,
      false,
      `Isi file tidak cocok dengan tipe ${type} (magic bytes tidak valid).`,
      null,
      400
    );
  }

  // Simpan via layer storage (nama UUID server-side).
  const storage_key = await storage.save(file.buffer, cfg.ext);

  // Default posisi = urutan berikutnya (paling bawah), bukan 0 — 0 selalu menaruh
  // item baru di ATAS item yang sudah ada (diurutkan ASC by position).
  let nextPosition = 0;
  if (position != null) {
    nextPosition = parseInt(position, 10);
  } else {
    const maxPosition = await LmsContentItem.max("position", {
      where: { section_id: req.lmsSection.id },
    });
    nextPosition = maxPosition != null ? maxPosition + 1 : 0;
  }

  const now = new Date();
  const cleanDesc = description == null
    ? null
    : (String(description).replace(/<[^>]*>/g, "").trim() || null);

  const item = await LmsContentItem.create({
    section_id: req.lmsSection.id, // dari middleware (terverifikasi)
    type,
    title,
    description: cleanDesc ? cleanDesc.slice(0, 2000) : null,
    position: nextPosition,
    is_published: is_published === true || is_published === "true",
    payload: {
      storage_key,
      file_name: sanitizeFileName(file.originalname),
      size: file.size,
      mime: cfg.mime,
    },
    created_at: now,
    updated_at: now,
  });

  return response(res, true, "File berhasil diunggah.", item, 201);
});

// PUT /lms/items/:id/upload  (protected + lecturerOwnsContentSection + lmsUpload)
// Ganti BERKAS item pdf/ppt yang sudah ada (dulu HANYA bisa lewat hapus+unggah ulang).
// `type` item TIDAK bisa diubah di sini (tetap pdf/ppt yang sama); title/description/
// is_published ikut diperbarui bila dikirim, konsisten dgn PUT /lms/items/:id biasa.
exports.replaceUploadItem = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem || (await LmsContentItem.findByPk(req.params.id));
  if (!item) {
    return response(res, false, "Item tidak ditemukan.", null, 404);
  }
  if (!SUPPORTED_UPLOAD_TYPES.includes(item.type)) {
    return response(
      res,
      false,
      `Item bertipe '${item.type}' tidak punya berkas untuk diganti lewat endpoint ini.`,
      null,
      400
    );
  }

  const file = req.file;
  if (!file) {
    return response(res, false, "File wajib diunggah (field 'file').", null, 400);
  }

  // Verifikasi isi file terhadap TIPE ITEM YANG SUDAH ADA (bukan dari body — cegah ganti type).
  const cfg = resolveUploadFormat(item.type, file.buffer);
  if (!cfg) {
    return response(
      res,
      false,
      `Isi file tidak cocok dengan tipe ${item.type} (magic bytes tidak valid).`,
      null,
      400
    );
  }

  // Simpan file baru DULU — bila storage.save gagal, berkas lama tetap utuh (fail-safe).
  const storage_key = await storage.save(file.buffer, cfg.ext);

  const { title, description, is_published } = req.body;
  const updates = {
    updated_at: new Date(),
    payload: {
      storage_key,
      file_name: sanitizeFileName(file.originalname),
      size: file.size,
      mime: cfg.mime,
    },
  };
  if (title !== undefined && String(title).trim() !== "") updates.title = title;
  if (description !== undefined) {
    const cleanDesc = description == null
      ? null
      : (String(description).replace(/<[^>]*>/g, "").trim() || null);
    updates.description = cleanDesc ? cleanDesc.slice(0, 2000) : null;
  }
  if (is_published !== undefined) {
    updates.is_published = is_published === true || is_published === "true";
  }

  const oldStorageKey = item.payload?.storage_key || null;
  await item.update(updates);

  // Hapus berkas lama SETELAH update DB sukses (hindari orphan bila update gagal duluan).
  // Best-effort: kegagalan hapus berkas lama tidak menggagalkan request (sudah tergantikan).
  if (oldStorageKey && oldStorageKey !== storage_key) {
    storage.remove(oldStorageKey).catch((err) => {
      console.error("replaceUploadItem: gagal hapus berkas lama:", err.message);
    });
  }

  return response(res, true, "Berkas berhasil diganti.", item);
});

// GET /lms/files/:id  (protected + classViewContentAccess → req.lmsContentItem sudah dimuat)
exports.serveFile = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem || (await LmsContentItem.findByPk(req.params.id));
  if (!item) {
    return response(res, false, "Item tidak ditemukan.", null, 404);
  }
  const payload = item.payload || {};
  if (!payload.storage_key) {
    return response(res, false, "Item ini tidak memiliki file.", null, 404);
  }
  if (!(await storage.exists(payload.storage_key))) {
    return response(res, false, "File tidak ditemukan di storage.", null, 404);
  }

  res.setHeader("Content-Type", payload.mime || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${payload.file_name || "file"}"`
  );

  const stream = storage.createReadStream(payload.storage_key);
  stream.on("error", (err) => {
    console.error("serveFile stream error:", err.message);
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
});

exports.SUPPORTED_UPLOAD_TYPES = SUPPORTED_UPLOAD_TYPES;
