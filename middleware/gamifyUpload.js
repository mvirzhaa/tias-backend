const multer = require("multer");
const path = require("path");

// Set Up Storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "image") {
      cb(null, "public/gamify");
    } else if (file.fieldname === "lencana") {
      cb(null, "public/gamify/lencana");
    }
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "image") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    } else if (file.fieldname === "lencana") {
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
  { name: "image", maxCount: 1 },
  { name: "lencana", maxCount: 1 },
]);

// Middleware function to use multer for file uploads
const gamifyUpload = (req, res, next) => {
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

module.exports = { gamifyUpload };
