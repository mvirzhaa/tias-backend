/**
 * Validasi + sanitasi payload per-tipe `lms_content_items.payload` (SPEC v8 §5 / v6 §5).
 *
 * Backend WAJIB memvalidasi bentuk payload sebelum simpan (tolak yang tidak sesuai skema
 * tipe) dan menyanitasi sesuai risiko tipe. Dikerjakan bertahap per tipe; registry di
 * bawah memudahkan menambah tipe berikutnya.
 *
 * Kontrak: validateContentPayload(type, payload) →
 *   { ok: true,  payload: <ternormalisasi>, validated: <bool> }
 *   { ok: false, error: <pesan> }
 * `validated:false` = belum ada validator untuk tipe itu (payload dilewatkan apa adanya).
 */

const sanitizeHtml = require("sanitize-html");

const ok = (payload) => ({ ok: true, payload, validated: true });
const err = (error) => ({ ok: false, error });

// Buang tag HTML dari teks polos (defense-in-depth; frontend tetap harus escape).
const stripTags = (s) => String(s).replace(/<[^>]*>/g, "");

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const toBool = (v, dflt) => {
  if (v == null) return dflt;
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined; // tanda invalid
};

/**
 * Page (v6 §5.1) — payload { html }. Konten rich-text editor (TipTap/Quill).
 *
 * Risiko UTAMA tipe ini: XSS — html disimpan lalu dirender mentah di FE. Backend WAJIB
 * menyanitasi (defense-in-depth; FE tetap DOMPurify saat render). Allowlist konservatif:
 * tag format teks, list, tabel, blockquote/code, gambar & tautan dgn skema http(s) saja.
 * `<script>`, event handler (onclick…), `javascript:`/`data:` URL → dibuang sanitizer.
 */
const PAGE_SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "hr", "span", "div",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    span: ["class"],
    div: ["class"],
    p: ["class"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  // Hanya skema aman; cegah javascript:/data: (XSS) pada href & src.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  // Paksa tautan eksternal aman (cegah tabnabbing) bila target=_blank.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

function validatePage(payload) {
  if (!isPlainObject(payload)) {
    return err("payload Page harus object { html }.");
  }
  const { html } = payload;
  if (typeof html !== "string") {
    return err("html wajib diisi (string).");
  }
  const clean = sanitizeHtml(html, PAGE_SANITIZE_OPTIONS);
  return ok({ html: clean });
}

/**
 * URL (v6 §5.5) — payload { url, label, open_in_new_tab }.
 * Risiko: protokol berbahaya (javascript:/data:) = XSS saat href dirender → WAJIB http/https.
 */
function validateUrl(payload) {
  if (!isPlainObject(payload)) {
    return err("payload URL harus object { url, label?, open_in_new_tab? }.");
  }
  const { url, label, open_in_new_tab } = payload;

  if (typeof url !== "string" || !url.trim()) {
    return err("url wajib diisi (string).");
  }
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch (_) {
    return err("url tidak valid.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return err("url harus berskema http atau https.");
  }

  if (label != null && typeof label !== "string") {
    return err("label harus string.");
  }
  const cleanLabel = label != null ? stripTags(label).trim().slice(0, 255) : null;

  const nt = toBool(open_in_new_tab, true);
  if (nt === undefined) return err("open_in_new_tab harus boolean.");

  return ok({ url: parsed.href, label: cleanLabel, open_in_new_tab: nt });
}

/**
 * Video YouTube (v6 §5.4) — payload { youtube_url, title? }.
 * `video_id` DITURUNKAN server-side dari URL (abaikan yang dikirim klien → cegah mismatch).
 * Risiko: hanya izinkan domain YouTube + id 11-char valid (frontend embed youtube-nocookie).
 */
function validateVideo(payload) {
  if (!isPlainObject(payload)) {
    return err("payload Video harus object { youtube_url, title? }.");
  }
  const { youtube_url, title } = payload;

  if (typeof youtube_url !== "string" || !youtube_url.trim()) {
    return err("youtube_url wajib diisi (string).");
  }
  let parsed;
  try {
    parsed = new URL(youtube_url.trim());
  } catch (_) {
    return err("youtube_url tidak valid.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return err("youtube_url harus berskema http atau https.");
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const allowed = ["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"];
  if (!allowed.includes(host)) {
    return err("youtube_url harus dari domain YouTube.");
  }

  // Ekstrak video_id dari berbagai bentuk URL YouTube.
  let id = null;
  if (host === "youtu.be") {
    id = parsed.pathname.split("/")[1];
  } else if (parsed.pathname === "/watch") {
    id = parsed.searchParams.get("v");
  } else {
    const m = parsed.pathname.match(/^\/(embed|shorts|v)\/([^/]+)/);
    if (m) id = m[2];
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return err("video_id tidak ditemukan / tidak valid pada youtube_url.");
  }

  if (title != null && typeof title !== "string") {
    return err("title harus string.");
  }
  const cleanTitle = title != null ? stripTags(title).trim().slice(0, 255) : null;

  return ok({ youtube_url: parsed.href, video_id: id, title: cleanTitle });
}

/**
 * Assignment (A5) — config disimpan di payload item type=assignment (bukan tabel terpisah).
 * payload { instructions?, due_at?, max_score, allow_late?, allowed_file_types? }.
 *   - instructions : HTML rich-text → disanitasi (allowlist Page; anti-XSS).
 *   - due_at       : ISO datetime NULLABLE (null = selalu terbuka).
 *   - max_score    : WAJIB, number > 0.
 *   - allow_late   : boolean, default true (true = terima telat + flag; false = tolak > due_at).
 *   - allowed_file_types : opsional subset SUBMISSION_FILE_TYPES (diisi → batasi; kosong/null
 *                          → seluruh allowlist diterima). Tipe submission divalidasi via magic bytes.
 */
const SUBMISSION_FILE_TYPES = ["pdf", "doc", "docx", "ppt", "pptx", "jpg", "png", "zip"];

function validateAssignment(payload) {
  if (!isPlainObject(payload)) {
    return err("payload Assignment harus object { max_score, due_at?, instructions?, allow_late?, allowed_file_types? }.");
  }
  const { instructions, due_at, max_score, allow_late, allowed_file_types } = payload;

  // max_score WAJIB > 0.
  const score = Number(max_score);
  if (max_score == null || !Number.isFinite(score) || score <= 0) {
    return err("max_score wajib diisi dan harus angka > 0.");
  }

  // due_at NULLABLE; bila diisi harus tanggal valid.
  let dueAt = null;
  if (due_at != null && String(due_at).trim() !== "") {
    const d = new Date(due_at);
    if (isNaN(d.getTime())) return err("due_at tidak valid (gunakan ISO datetime).");
    dueAt = d.toISOString();
  }

  // allow_late default true.
  const late = toBool(allow_late, true);
  if (late === undefined) return err("allow_late harus boolean.");

  // instructions opsional → sanitasi HTML (allowlist Page).
  let cleanInstructions = null;
  if (instructions != null) {
    if (typeof instructions !== "string") return err("instructions harus string (HTML).");
    cleanInstructions = sanitizeHtml(instructions, PAGE_SANITIZE_OPTIONS);
  }

  // allowed_file_types opsional → subset allowlist.
  let allowed = null;
  if (allowed_file_types != null) {
    if (!Array.isArray(allowed_file_types)) {
      return err("allowed_file_types harus array.");
    }
    const norm = allowed_file_types.map((t) => String(t).toLowerCase().trim());
    const invalid = norm.filter((t) => !SUBMISSION_FILE_TYPES.includes(t));
    if (invalid.length) {
      return err(`allowed_file_types tidak valid: ${invalid.join(", ")}. Pilihan: ${SUBMISSION_FILE_TYPES.join(", ")}.`);
    }
    allowed = [...new Set(norm)];
    if (allowed.length === 0) allowed = null; // array kosong = tanpa batasan
  }

  return ok({
    instructions: cleanInstructions,
    due_at: dueAt,
    max_score: score,
    allow_late: late,
    allowed_file_types: allowed,
  });
}

/**
 * Exam/CBT (integrasi LMS-CBT) — payload { cbt_exam_id, cbt_nama_ujian? }.
 * LMS tidak menyimpan soal/nilai sendiri — hanya menautkan ke `exams.id` milik cbt-api.
 * `cbt_nama_ujian` cuma cache label tampilan (diambil ulang dari cbt-api saat dosen memilih).
 */
function validateExam(payload) {
  if (!isPlainObject(payload)) {
    return err("payload Ujian (CBT) harus object { cbt_exam_id, cbt_nama_ujian? }.");
  }
  const { cbt_exam_id, cbt_nama_ujian } = payload;

  const examId = Number(cbt_exam_id);
  if (!Number.isInteger(examId) || examId <= 0) {
    return err("cbt_exam_id wajib diisi (integer > 0) — pilih ujian CBT terlebih dahulu.");
  }

  if (cbt_nama_ujian != null && typeof cbt_nama_ujian !== "string") {
    return err("cbt_nama_ujian harus string.");
  }
  const cleanNama = cbt_nama_ujian != null ? stripTags(cbt_nama_ujian).trim().slice(0, 255) : null;

  return ok({ cbt_exam_id: examId, cbt_nama_ujian: cleanNama });
}

const validators = {
  page: validatePage,
  url: validateUrl,
  video: validateVideo,
  assignment: validateAssignment,
  exam: validateExam,
};

// Tipe berbasis upload file — TIDAK boleh dibuat/diubah payload-nya lewat JSON biasa;
// wajib lewat endpoint upload (file disimpan server-side via storage layer).
const FILE_TYPES = ["pdf", "ppt"];

function validateContentPayload(type, payload) {
  const v = validators[type];
  if (!v) return { ok: true, payload: payload != null ? payload : null, validated: false };
  return v(payload);
}

module.exports = { validateContentPayload, validators, FILE_TYPES, SUBMISSION_FILE_TYPES };
