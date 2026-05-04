const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if(file.fieldname === "pamflet") {
      cb(null, "public/berita/pamflet");
    } else if(file.fieldname === "dokumen"){
      cb(null, "public/berita/dokumen");
    }
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "pamflet") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    } else if (file.fieldname === "dokumen") {
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
    if (file.fieldname === "pamflet") {
      if (
        file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image file are allowed."));
      }
    } else if (file.fieldname === "dokumen"){
      if (
        file.mimetype.startsWith("image/") ||
        file.mimetype === "application/pdf"
      ) {
        cb(null, true);
      } else {
        cb(new Error("Only image and PDF files are allowed."));
      }
    }
   
  },
  limits: {
    fileSize: 10000000,
  },
}).fields([
  { name: "pamflet", maxCount: 1 },
  { name: "dokumen", maxCount: 1 },
]);

const beritaUpload = (req, res, next) => {
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

module.exports = {beritaUpload}