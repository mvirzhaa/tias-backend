const multer = require("multer");
const path = require("path");

// Set Up Storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/import-bk");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Set up multer middleware for file uploads
const fileUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // for .xlsx files
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed."));
    }
  },
  limits: {
    fileSize: 20000000, // 20 MB file size limit
  },
}).single("file");

// Middleware function to use multer for file uploads
const ImportBk = (req, res, next) => {
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

module.exports = { ImportBk };
