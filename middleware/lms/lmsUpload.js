const multer = require("multer");
const { response } = require("../../lib/response");

/**
 * Upload handler LMS (PDF & PPT; Assignment menyusul).
 *
 * - memoryStorage: file masuk ke buffer agar bisa dicek MAGIC BYTES & disimpan via layer
 *   storage (BUKAN langsung ke disk oleh multer).
 * - Batas ukuran tegas via env LMS_MAX_UPLOAD_MB (default 25 MB).
 * - Validasi MIME sebenarnya (magic bytes) & penamaan UUID dilakukan di controller/storage,
 *   BUKAN di sini (fileFilter mimetype klien tidak dipercaya).
 */

const maxMb = parseInt(process.env.LMS_MAX_UPLOAD_MB || "25", 10);
const MAX_BYTES = maxMb * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
}).single("file");

// Bungkus agar error multer (mis. file kelewat besar) jadi respons JSON konsisten (default DENY).
const lmsUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return response(res, false, `Ukuran file melebihi batas ${maxMb} MB.`, null, 413);
      }
      return response(res, false, `Gagal mengunggah file: ${err.message}`, null, 400);
    }
    next();
  });
};

module.exports = { lmsUpload, MAX_BYTES, maxMb };
