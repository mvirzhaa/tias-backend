const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "lembar_pengesahan") {
      cb(null, "public/tugas-akhir/lembar-pengesahan");
    } else if (file.fieldname === "dokumen_skripsi") {
      cb(null, "public/tugas-akhir/final-skripsi");
    }
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "lembar_pengesahan") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    } else if (file.fieldname === "dokumen_skripsi") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    }
  },
});

const fileUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed."));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
}).fields([
  { name: "lembar_pengesahan", maxCount: 1 },
  { name: "dokumen_skripsi", maxCount: 1 },
]);

const uploadFinalSkripsi = (req, res, next) => {
  fileUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: err.message });
    }
    next();
  });
};

module.exports = { uploadFinalSkripsi };
