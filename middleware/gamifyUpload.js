const multer = require("multer");
const path = require("path");

// Set Up Storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/gamify");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Set up multer middleware for file uploads
const fileUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept image and PDF files
    if (
      file.mimetype.startsWith("image/") 
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and file are allowed."));
    }
  },
  limits: {
    fileSize: 10000000, // 10 MB file size limit
  },
}).single("image");

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
