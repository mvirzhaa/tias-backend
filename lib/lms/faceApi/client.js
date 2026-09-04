const axios = require("axios");
const FormData = require("form-data");

/**
 * Klien HTTP untuk service face recognition eksternal (dipakai juga oleh tias-mobile):
 * base URL & header X-API-Key dari env, pola sama dengan lib/lms/siakV2/client.js.
 *
 * TIDAK ada retry (beda dengan siakV2 client): `verify` adalah aksi interaktif sinkron —
 * seorang mahasiswa sedang menunggu di depan kamera. Retry otomatis pada 5xx/timeout cuma
 * memperlama tunggu tanpa mengubah hasil; kalau gagal, mahasiswa yang menekan ulang tombol
 * submit (re-submit), bukan server yang diam-diam mencoba lagi.
 */

const TIMEOUT_MS = parseInt(process.env.FACE_API_TIMEOUT_MS || "15000", 10);

function createClient() {
  const baseURL = process.env.FACE_API_URL;
  if (!baseURL) {
    throw new Error("FACE_API_URL wajib diisi untuk presensi face recognition.");
  }

  const headers = {};
  const apiKey = process.env.FACE_API_KEY;
  if (apiKey && apiKey.trim() !== "") {
    headers["X-API-Key"] = apiKey.trim();
  }

  return axios.create({ baseURL, timeout: TIMEOUT_MS, headers });
}

// true bila subjectId (NPM) sudah enroll wajahnya, false bila 404. Error lain dilempar.
async function isEnrolled(client, subjectId) {
  try {
    await client.get(`/v1/faces/subjects/${encodeURIComponent(subjectId)}`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) return false;
    throw error;
  }
}

// -> { subjectId, score, threshold, match }
async function verify(client, { subjectId, imageBuffer, filename, threshold }) {
  const formData = new FormData();
  formData.append("subject_id", subjectId);
  if (threshold !== undefined && threshold !== null) {
    formData.append("threshold", String(threshold));
  }
  formData.append("image", imageBuffer, {
    filename: filename || "presensi.jpg",
    contentType: "image/jpeg",
  });

  const response = await client.post("/v1/faces/verify", formData, {
    headers: formData.getHeaders(),
  });

  const { subject_id: respSubjectId, score, threshold: respThreshold, match } = response.data;
  return { subjectId: respSubjectId, score, threshold: respThreshold, match: !!match };
}

module.exports = { createClient, isEnrolled, verify };
