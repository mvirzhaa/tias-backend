const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "pas_foto") {
      cb(null, "public/tugas-akhir/pas-foto");
    } else if (file.fieldname === "draft_final_skripsi") {
      cb(null, "public/tugas-akhir/draft-skripsi");
    }
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "pas_foto") {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    } else if (file.fieldname === "draft_final_skripsi") {
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
    if (file.fieldname === "pas_foto") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Pas Foto Only image files are allowed."));
      }
    } else if (file.fieldname === "draft_final_skripsi") {
      if (
        file.mimetype === "application/msword" ||
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        cb(null, true);
      } else {
        cb(new Error("Draft Skripsi Only Word documents are allowed."));
      }
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
}).fields([
  { name: "pas_foto", maxCount: 1 },
  { name: "draft_final_skripsi", maxCount: 1 },
]);

const pengajuanSidangUpload = (req, res, next) => {
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

module.exports = { pengajuanSidangUpload };
