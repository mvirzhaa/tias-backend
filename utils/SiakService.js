const axios = require("axios");

/**
 * SiakService — SPEC v7 §2.1 / Fase 0.5.
 *
 * Mengelola koneksi & Bearer Token ke SIAK v2 (https://api-siak.uika-bogor.ac.id/api).
 * - login() ke `POST /auth/login` dgn kredensial sistem (env), simpan token di memori.
 * - get()/request() menyisipkan token otomatis via interceptor; pada 401 → refresh sekali, retry.
 * - Default DENY: bila login gagal / SIAK down, kesalahan dilempar agar pemanggil (middleware)
 *   menolak akses, BUKAN fail-open.
 *
 * ENV yang dibutuhkan (set di .env):
 *   SIAK_V2_API_URL   (mis. https://api-siak.uika-bogor.ac.id/api)
 *   SIAK_V2_USERNAME
 *   SIAK_V2_PASSWORD
 */

let cachedToken = null;

const baseURL = () => process.env.SIAK_V2_API_URL;

// Instance axios khusus SIAK v2.
const client = axios.create({
  timeout: 15000,
});

// Sisipkan baseURL + Bearer token di setiap request.
client.interceptors.request.use((config) => {
  config.baseURL = baseURL();
  if (cachedToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

// Pada 401: refresh token sekali, lalu retry request asli.
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response && error.response.status;
    if (status === 401 && !original.__isRetry) {
      original.__isRetry = true;
      await login(true);
      return client(original);
    }
    return Promise.reject(error);
  }
);

/**
 * Login ke SIAK v2 dan cache token. `force` mengabaikan token yang ada.
 * Throw bila kredensial tak lengkap atau SIAK menolak/down (→ default DENY di pemanggil).
 */
async function login(force = false) {
  if (cachedToken && !force) return cachedToken;

  const username = process.env.SIAK_V2_USERNAME;
  const password = process.env.SIAK_V2_PASSWORD;
  if (!baseURL() || !username || !password) {
    throw new Error(
      "SiakService: SIAK_V2_API_URL/USERNAME/PASSWORD belum dikonfigurasi di .env."
    );
  }

  // Pakai axios polos (tanpa interceptor) agar tidak rekursif saat login.
  const resp = await axios.post(
    `${baseURL()}/auth/login`,
    { username, password },
    { timeout: 15000 }
  );

  // Bentuk respons token belum dikonfirmasi tim SIAK v2 → tangani beberapa kemungkinan.
  const data = resp.data || {};
  const token =
    data.token ||
    data.access_token ||
    (data.data && (data.data.token || data.data.access_token));

  if (!token) {
    throw new Error("SiakService: token tidak ditemukan pada respons login SIAK v2.");
  }

  cachedToken = token;
  return cachedToken;
}

/**
 * GET ke SIAK v2 dengan token terjamin. Memastikan login bila belum ada token.
 */
async function get(path, config = {}) {
  if (!cachedToken) await login();
  return client.get(path, config);
}

/**
 * POST ke SIAK v2 dengan token terjamin.
 */
async function post(path, body, config = {}) {
  if (!cachedToken) await login();
  return client.post(path, body, config);
}

function clearToken() {
  cachedToken = null;
}

module.exports = { login, get, post, clearToken, client };
