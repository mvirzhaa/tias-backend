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

  const now = new Date();
  const cleanDesc = description == null
    ? null
    : (String(description).replace(/<[^>]*>/g, "").trim() || null);

  const item = await LmsContentItem.create({
    section_id: req.lmsSection.id, // dari middleware (terverifikasi)
    type,
    title,
    description: cleanDesc ? cleanDesc.slice(0, 2000) : null,
    position: position != null ? parseInt(position, 10) : 0,
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
