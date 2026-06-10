const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

/**
 * Layer abstraksi storage untuk file LMS (PDF/PPT/Assignment).
 *
 * Implementasi hari ini: disk lokal di folder TERPISAH dari `public/` (TIDAK di-serve
 * sebagai static) → file hanya bisa diakses lewat endpoint berotorisasi (lihat
 * controllers/lms/fileController.js). Antarmuka sengaja minimal & netral agar bisa
 * diganti S3/MinIO nanti TANPA mengubah controller.
 *
 * Kunci (`key`) = nama file acak server-side (UUID + ext). Nama asli klien TIDAK dipakai
 * sebagai kunci (cegah path traversal & tabrakan).
 *
 * Konfigurasi: LMS_STORAGE_DIR (default "storage/lms").
 */

const BASE_DIR = process.env.LMS_STORAGE_DIR || "storage/lms";

// Pastikan key hanya nama file polos (tanpa segmen path) → cegah traversal.
function resolveKeyPath(key) {
  if (typeof key !== "string" || !key) throw new Error("storage key tidak valid.");
  const safe = path.basename(key);
  if (safe !== key) throw new Error("storage key tidak valid (mengandung path).");
  return path.join(BASE_DIR, safe);
}

// Simpan buffer, kembalikan key acak. `ext` tanpa titik (mis. "pdf").
async function save(buffer, ext) {
  await fs.ensureDir(BASE_DIR);
  const clean = ext ? `.${String(ext).replace(/^\./, "")}` : "";
  const key = `${crypto.randomUUID()}${clean}`;
  await fs.writeFile(resolveKeyPath(key), buffer);
  return key;
}

function createReadStream(key) {
  return fs.createReadStream(resolveKeyPath(key));
}

async function exists(key) {
  return fs.pathExists(resolveKeyPath(key));
}

async function stat(key) {
  return fs.stat(resolveKeyPath(key));
}

async function remove(key) {
  await fs.remove(resolveKeyPath(key));
}

module.exports = { save, createReadStream, exists, stat, remove, BASE_DIR };
