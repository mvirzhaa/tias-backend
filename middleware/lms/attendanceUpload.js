const multer = require("multer");
const { response } = require("../../lib/response");

/**
 * Upload handler khusus foto presensi (selfie untuk face recognition).
 *
 * Pola sama dengan middleware/lms/lmsUpload.js (memoryStorage → buffer diteruskan langsung
 * sebagai multipart ke face-api, bukan ditulis ke disk oleh multer), tapi batas ukuran
 * terpisah (FACE_PHOTO_MAX_MB, default 5) karena selfie JPEG jauh lebih kecil dari dokumen
 * PDF/PPT yang dipakai LMS_MAX_UPLOAD_MB.
 *
 * Validasi MIME sebenarnya bukan di sini (mimetype klien tidak dipercaya) — controller
 * melakukan pre-check `image/*` ringan sebelum memanggil face-api (gagal cepat, hemat kuota
 * panggilan eksternal); pada akhirnya face-api sendiri yang menolak bila bukan gambar wajah.
 */

const maxMb = parseInt(process.env.FACE_PHOTO_MAX_MB || "5", 10);
const MAX_BYTES = maxMb * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
}).single("image");

const attendanceUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return response(res, false, `Ukuran foto melebihi batas ${maxMb} MB.`, null, 413);
      }
      return response(res, false, `Gagal mengunggah foto: ${err.message}`, null, 400);
    }
    if (!req.file) {
      return response(res, false, "Foto wajah wajib diunggah.", null, 400);
    }
    next();
  });
};

module.exports = { attendanceUpload, MAX_BYTES, maxMb };
