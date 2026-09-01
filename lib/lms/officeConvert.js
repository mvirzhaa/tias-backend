const { execFile } = require("child_process");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

/**
 * Konversi PPT/PPTX -> PDF via LibreOffice headless (`soffice --convert-to pdf`), dipanggil
 * saat upload item type=ppt supaya bisa disajikan sebagai preview inline (browser tidak
 * punya renderer native utk pptx, beda dgn pdf).
 *
 * Infrastruktur baru di codebase ini (belum ada shell-out/child_process/temp-file dir
 * sebelumnya) — beberapa hal yang WAJIB ditangani:
 *  - LibreOffice headless mengunci SATU direktori profil per proses; tanpa profil terpisah,
 *    dua konversi bersamaan bisa saling deadlock/gagal. Maka `-env:UserInstallation` diarahkan
 *    ke folder temp unik per panggilan.
 *  - `soffice` beroperasi pada file di disk (bukan stdin/stdout) — buffer ditulis ke file
 *    input temp dulu, hasil dibaca balik dari file output temp.
 *  - SEMUA file/folder temp dibersihkan di `finally`, termasuk saat gagal/timeout, supaya
 *    /tmp tidak numpuk sampah dari upload yang gagal dikonversi.
 *
 * Kegagalan (binary tak ada / timeout / file korup) sengaja TIDAK melempar detail teknis ke
 * caller selain Error biasa — caller (fileController) memutuskan upload tetap sukses tanpa
 * preview (fail-open), bukan tanggung jawab modul ini.
 */

const SOFFICE_BIN = process.env.SOFFICE_BIN || "soffice";
const TIMEOUT_MS = parseInt(process.env.OFFICE_CONVERT_TIMEOUT_MS || "30000", 10);

// Konversi buffer (isi file ppt/pptx) -> Buffer PDF. `sourceExt` tanpa titik (mis. "pptx").
async function convertToPdf(buffer, sourceExt) {
  const workDir = path.join(os.tmpdir(), `lo-convert-${crypto.randomUUID()}`);
  const profileDir = path.join(workDir, "profile");
  const inputPath = path.join(workDir, `input.${sourceExt}`);

  try {
    await fs.ensureDir(profileDir);
    await fs.writeFile(inputPath, buffer);

    await execFileAsync(
      SOFFICE_BIN,
      [
        "--headless",
        "--norestore",
        `-env:UserInstallation=file://${profileDir}`,
        "--convert-to",
        "pdf",
        "--outdir",
        workDir,
        inputPath,
      ],
      { timeout: TIMEOUT_MS }
    );

    const outputPath = path.join(workDir, "input.pdf");
    if (!(await fs.pathExists(outputPath))) {
      throw new Error("Konversi selesai tapi file PDF hasil tidak ditemukan.");
    }
    return await fs.readFile(outputPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Binary '${SOFFICE_BIN}' tidak ditemukan di server.`);
    }
    if (error.killed || error.signal === "SIGTERM") {
      throw new Error(`Konversi PPT->PDF timeout setelah ${TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    await fs.remove(workDir).catch(() => {});
  }
}

function execFileAsync(cmd, args, options) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

module.exports = { convertToPdf };
