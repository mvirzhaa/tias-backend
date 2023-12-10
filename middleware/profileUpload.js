const multer = require("multer");
const path = require("path");

// Set Up Storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "file_dok_pribadi") {
      cb(null, "public/dokumen-pribadi");
    } else if (file.fieldname === "file_kepangkatan") {
      cb(null, "public/file-kepangkatan");
    } else if (file.fieldname === "file_jabatan") {
      cb(null, "public/file-jabatan");
    }
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "file_dok_pribadi") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    } else if (file.fieldname === "file_kepangkatan") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    } else if (file.fieldname === "file_jabatan") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    }
  },
});

// Set up multer middleware for file uploads
const fileUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept image and PDF files
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
    fileSize: 10000000, // 10 MB file size limit
  },
}).fields([
  { name: "file_dok_pribadi", maxCount: 1 },
  { name: "file_kepangkatan", maxCount: 1 },
  { name: "file_jabatan", maxCount: 1 },
]);

// Middleware function to use multer for file uploads
const profileUpload = (req, res, next) => {
  fileUpload(req, res, (err) => {
    if (err) {
      // Handle Multer errors
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
      }
      // Handle other errors
      return res.status(500).json({ message: err.message });
    }
    next();
  });
};

module.exports = { profileUpload };
