/**
 * Deteksi tipe file via MAGIC BYTES (bukan ekstensi / mimetype klien yang bisa dipalsukan).
 * Dipakai upload handler LMS untuk memastikan isi file benar-benar sesuai tipe yang diklaim.
 */

const SIGNATURES = {
  // PDF diawali "%PDF"
  pdf: (b) =>
    b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  // JPEG diawali "FF D8 FF"
  jpg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  // PNG diawali "89 50 4E 47 0D 0A 1A 0A"
  png: (b) =>
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
};

// ZIP container ("PK\x03\x04") — wadah OOXML (pptx/docx/xlsx).
const isZip = (b) =>
  b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

// OLE Compound File ("D0 CF 11 E0 A1 B1 1A E1") — wadah format Office lama (ppt/doc/xls).
const isOle = (b) =>
  b.length >= 8 &&
  b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 &&
  b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1;

// Cari substring biner (ascii/utf16le) di dalam buffer.
const bufHas = (b, str, enc) => b.includes(Buffer.from(str, enc));

/**
 * Varian PPT terdeteksi dari isi file, atau null bila bukan presentasi.
 *
 * pptx & docx & xlsx sama-sama ZIP → cek penanda internal "ppt/" (path entri OOXML
 * presentation, mis. "ppt/presentation.xml") agar docx/xlsx TIDAK lolos sebagai ppt.
 * ppt lama & doc & xls sama-sama OLE → cek penanda stream "PowerPoint" (UTF-16LE) agar
 * doc/xls TIDAK lolos. Default DENY: bila penanda tak ada → null.
 */
function pptVariant(buffer) {
  if (isZip(buffer) && bufHas(buffer, "ppt/", "latin1")) return "pptx";
  if (isOle(buffer) && bufHas(buffer, "PowerPoint", "utf16le")) return "ppt";
  return null;
}

// Apakah buffer cocok dengan tipe yang diharapkan?
function matchesType(buffer, type) {
  if (type === "ppt") return pptVariant(buffer) !== null;
  const fn = SIGNATURES[type];
  return fn ? fn(buffer) : false;
}

/**
 * Deteksi tipe file submission Assignment dari ISI (magic bytes), kembalikan tipe kanonik
 * salah satu: pdf | doc | docx | ppt | pptx | jpg | png | zip — atau null bila tak dikenal/
 * tidak diizinkan (mis. xlsx). Server HANYA menyimpan & menyajikan byte; tidak pernah
 * mengekstrak/mengeksekusi. Default DENY.
 *
 * Urutan deteksi penting: OOXML/OLE (docx/pptx/doc/ppt) adalah wadah ZIP/OLE → cek penanda
 * internal SEBELUM jatuh ke "zip" generik; xlsx ("xl/") ditolak.
 */
function detectSubmissionType(buffer) {
  if (SIGNATURES.pdf(buffer)) return "pdf";
  if (SIGNATURES.jpg(buffer)) return "jpg";
  if (SIGNATURES.png(buffer)) return "png";
  if (isOle(buffer)) {
    if (bufHas(buffer, "PowerPoint", "utf16le")) return "ppt";
    if (bufHas(buffer, "WordDocument", "utf16le")) return "doc";
    return null; // OLE lain (xls dll) tidak diizinkan
  }
  if (isZip(buffer)) {
    if (bufHas(buffer, "ppt/", "latin1")) return "pptx";
    if (bufHas(buffer, "word/", "latin1")) return "docx";
    if (bufHas(buffer, "xl/", "latin1")) return null; // xlsx tidak diizinkan
    return "zip"; // ZIP generik (diizinkan)
  }
  return null;
}

module.exports = { matchesType, pptVariant, detectSubmissionType, SIGNATURES };
