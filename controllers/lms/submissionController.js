const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const storage = require("../../lib/lms/storage");
const { detectSubmissionType } = require("../../lib/lms/fileType");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const LmsSubmission = require("../../models/lms/LmsSubmission");
const SiakV2Participant = require("../../models/lms/SiakV2Participant");

/**
 * Submission Assignment (A5). Config tugas ada di item.payload (type=assignment).
 * Otorisasi & pemuatan entitas oleh middleware submissionAccess:
 *   req.lmsContentItem (assignment) · req.lmsSubmission · req.lmsIsLecturer · req.lmsLecturerId.
 * Identitas mahasiswa SELALU dari JWT (req.user.siakUserUuid) — TIDAK pernah dari body.
 */

// Tipe submission kanonik → ext/mime. Server hanya menyimpan & menyajikan byte (tak ekstrak).
const SUBMISSION_FORMATS = {
  pdf: { ext: "pdf", mime: "application/pdf" },
  doc: { ext: "doc", mime: "application/msword" },
  docx: {
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  ppt: { ext: "ppt", mime: "application/vnd.ms-powerpoint" },
  pptx: {
    ext: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  jpg: { ext: "jpg", mime: "image/jpeg" },
  png: { ext: "png", mime: "image/png" },
  zip: { ext: "zip", mime: "application/zip" },
};

const stripTags = (s) => String(s).replace(/<[^>]*>/g, "");
const cleanText = (s, max) => stripTags(s).trim().slice(0, max);

// is_late dihitung dari due_at TERKINI (item.payload), bukan snapshot mati.
function computeIsLate(item, submittedAt) {
  const due = item && item.payload && item.payload.due_at;
  if (!due) return false;
  return new Date(submittedAt).getTime() > new Date(due).getTime();
}

// Bentuk respons submission dgn is_late segar (dihitung saat baca).
function serialize(submission, item) {
  const json = submission.toJSON ? submission.toJSON() : submission;
  return { ...json, is_late: computeIsLate(item, json.submitted_at) };
}

// POST /lms/items/:id/submissions  (studentEnrolledContent + lmsUpload)
// Submit / resubmit. Resubmit menimpa baris yang sama; terkunci setelah dinilai.
exports.submitAssignment = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem; // assignment terverifikasi middleware
  const cfg = item.payload || {};
  const siakMahasiswaId = req.user.siakUserUuid; // dipaksa server-side (anti spoof)
  if (!siakMahasiswaId) {
    return response(res, false, "Identitas mahasiswa SIAK tidak ditemukan.", null, 403);
  }

  const text = req.body.text != null ? cleanText(req.body.text, 50000) : null;
  const hasText = !!text;
  const hasFile = !!req.file;
  if (!hasText && !hasFile) {
    return response(res, false, "Submission wajib berisi teks dan/atau file.", null, 400);
  }

  // Validasi file (magic bytes) + allowlist tipe (allowed_file_types opsional).
  let fileMeta = null;
  if (hasFile) {
    const detected = detectSubmissionType(req.file.buffer);
    if (!detected) {
      return response(res, false, "Tipe file tidak dikenali/diizinkan.", null, 400);
    }
    if (
      Array.isArray(cfg.allowed_file_types) &&
      cfg.allowed_file_types.length > 0 &&
      !cfg.allowed_file_types.includes(detected)
    ) {
      return response(
        res,
        false,
        `Tipe file '${detected}' tidak diizinkan. Diizinkan: ${cfg.allowed_file_types.join(", ")}.`,
        null,
        400
      );
    }
    fileMeta = { detected, format: SUBMISSION_FORMATS[detected] };
  }

  // Kebijakan telat (due_at TERKINI).
  const now = new Date();
  const due = cfg.due_at ? new Date(cfg.due_at) : null;
  const isLate = due ? now.getTime() > due.getTime() : false;
  const allowLate = cfg.allow_late !== false; // default true
  if (due && isLate && !allowLate) {
    return response(res, false, "Deadline telah lewat; pengumpulan ditutup.", null, 403);
  }

  // Submission aktif yang ada (resubmit) — partial unique menjamin maksimal satu.
  const existing = await LmsSubmission.findOne({
    where: { content_item_id: item.id, siak_mahasiswa_id: siakMahasiswaId },
  });
  if (existing && existing.graded_at) {
    return response(res, false, "Submission sudah dinilai; tidak bisa dikirim ulang.", null, 403);
  }

  // Simpan file baru (bila ada) ke storage non-publik (key UUID server-side).
  let storage_key = null;
  if (fileMeta) {
    storage_key = await storage.save(req.file.buffer, fileMeta.format.ext);
  }

  if (existing) {
    // Resubmit = ganti penuh isi. Hapus file lama saat diganti ATAU saat beralih ke teks-saja.
    const oldKey = existing.storage_key;
    await existing.update({
      text,
      storage_key,
      file_name: fileMeta ? sanitizeName(req.file.originalname) : null,
      size: fileMeta ? req.file.size : null,
      mime: fileMeta ? fileMeta.format.mime : null,
      submitted_at: now,
      is_late: isLate,
      updated_at: now,
    });
    if (oldKey && oldKey !== storage_key) {
      try {
        await storage.remove(oldKey);
      } catch (e) {
        console.error("submitAssignment: gagal hapus file lama:", e.message);
      }
    }
    return response(res, true, "Submission diperbarui.", serialize(existing, item));
  }

  const created = await LmsSubmission.create({
    content_item_id: item.id,
    siak_mahasiswa_id: siakMahasiswaId,
    text,
    storage_key,
    file_name: fileMeta ? sanitizeName(req.file.originalname) : null,
    size: fileMeta ? req.file.size : null,
    mime: fileMeta ? fileMeta.format.mime : null,
    submitted_at: now,
    is_late: isLate,
    created_at: now,
    updated_at: now,
  });

  return response(res, true, "Submission terkirim.", serialize(created, item), 201);
});

// GET /lms/items/:id/submissions/me  (studentEnrolledContent)
exports.getMySubmission = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem;
  const submission = await LmsSubmission.findOne({
    where: { content_item_id: item.id, siak_mahasiswa_id: req.user.siakUserUuid },
  });
  if (!submission) {
    return response(res, true, "Belum ada submission.", null);
  }
  return response(res, true, "Success", serialize(submission, item));
});

// GET /lms/items/:id/submissions?page=&limit=  (lecturerOwnsContentSection) — semua submission.
exports.listSubmissions = asyncHandler(async (req, res) => {
  const item = req.lmsContentItem || (await LmsContentItem.findByPk(req.params.id));
  if (!item || item.type !== "assignment") {
    return response(res, false, "Item ini bukan assignment.", null, 400);
  }

  const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const pagelimit = getPagination(limit, page);

  const data = await LmsSubmission.findAndCountAll({
    where: { content_item_id: item.id },
    order: [["submitted_at", "DESC"]],
    limit: pagelimit.limit,
    offset: pagelimit.offset,
  });

  // Lampirkan npm/nama mahasiswa dari siak_v2_participants — submission sendiri hanya
  // menyimpan siak_mahasiswa_id (UUID), tak berguna ditampilkan mentah ke dosen.
  const kelasKuliahId = req.lmsSection && req.lmsSection.kelasKuliahId;
  const mhsIds = [...new Set(data.rows.map((s) => s.siak_mahasiswa_id))];
  const participants =
    kelasKuliahId && mhsIds.length
      ? await SiakV2Participant.findAll({
          where: { kelasKuliahId, siak_mahasiswa_id: mhsIds },
          attributes: ["siak_mahasiswa_id", "npm", "nama"],
        })
      : [];
  const pmap = new Map(participants.map((p) => [p.siak_mahasiswa_id, p]));

  return response(res, true, "Success", {
    limit,
    page,
    total: data.count,
    total_page: Math.ceil(parseInt(data.count) / limit),
    rows: data.rows.map((s) => {
      const p = pmap.get(s.siak_mahasiswa_id);
      return { ...serialize(s, item), npm: p?.npm || null, nama_mahasiswa: p?.nama || null };
    }),
  });
});

// GET /lms/submissions/:submissionId  (submissionViewAccess) — dosen ATAU pemilik baris.
exports.getSubmission = asyncHandler(async (req, res) => {
  return response(res, true, "Success", serialize(req.lmsSubmission, req.lmsContentItem));
});

// GET /lms/submissions/:submissionId/file  (submissionViewAccess) — stream berotorisasi.
exports.serveSubmissionFile = asyncHandler(async (req, res) => {
  const submission = req.lmsSubmission;
  if (!submission.storage_key) {
    return response(res, false, "Submission ini tidak memiliki file.", null, 404);
  }
  if (!(await storage.exists(submission.storage_key))) {
    return response(res, false, "File tidak ditemukan di storage.", null, 404);
  }

  res.setHeader("Content-Type", submission.mime || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${submission.file_name || "file"}"`
  );

  const stream = storage.createReadStream(submission.storage_key);
  stream.on("error", (err) => {
    console.error("serveSubmissionFile stream error:", err.message);
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
});

// PATCH /lms/submissions/:submissionId/grade  (lecturerGradesSubmission) — boleh re-grade.
exports.gradeSubmission = asyncHandler(async (req, res) => {
  const submission = req.lmsSubmission;
  const item = req.lmsContentItem;
  const maxScore = Number((item.payload || {}).max_score);

  const score = Number(req.body.score);
  if (req.body.score == null || !Number.isFinite(score)) {
    return response(res, false, "score wajib diisi (angka).", null, 400);
  }
  if (score < 0 || (Number.isFinite(maxScore) && score > maxScore)) {
    return response(res, false, `score harus di antara 0 dan ${maxScore}.`, null, 400);
  }

  const feedback =
    req.body.feedback != null ? cleanText(req.body.feedback, 10000) : null;

  const now = new Date();
  await submission.update({
    score,
    feedback,
    graded_by: req.lmsLecturerId, // dosen dari JWT (middleware)
    graded_at: now,
    updated_at: now,
  });

  return response(res, true, "Submission dinilai.", serialize(submission, item));
});

// Bersihkan nama file klien (display only).
function sanitizeName(name) {
  const path = require("path");
  const base = path.basename(String(name || "")).replace(/[^\w.\- ]/g, "_");
  return base.slice(0, 200) || "file";
}
