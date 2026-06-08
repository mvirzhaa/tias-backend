const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const { response } = require("../../lib/response");

const destPath = path.join(__dirname, "../../public/lampiran-surat");
fs.ensureDirSync(destPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `lampiran-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    const allowedExtensions = [".jpeg", ".jpg", ".png", ".pdf"];

    const extname = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(extname)) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file PDF, JPG, JPEG, atau PNG yang diizinkan!"), false);
    }
  },
}).array("lampiran", 5);

const persuratanUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      let errorMessage = err.message;
      if (err.code === "LIMIT_FILE_SIZE") errorMessage = "Ukuran file terlalu besar (Maksimal 10MB per file).";
      if (err.code === "LIMIT_UNEXPECTED_FILE") errorMessage = "Maksimal hanya boleh mengunggah 5 lampiran.";

      return response(res, false, errorMessage);
    } else if (err) {
      return response(res, false, err.message);
    }

    next();
  });
};

module.exports = { persuratanUpload };
