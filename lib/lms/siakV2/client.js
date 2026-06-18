const axios = require("axios");

/**
 * Klien HTTP SIAK v2 (BRIEF v2 Task 3, sumber=pull-direct, auth=API key).
 *
 * - baseURL  : SIAK_V2_API_URL.
 * - Auth     : header `X-API-Key` HANYA bila SIAK_V2_API_KEY terisi. Kosong → mode
 *              lokal (be-siakad lokal tanpa key). Lihat guard permisif sisi SIAKAD.
 * - Retry    : 429 / 5xx / error jaringan, backoff eksponensial (dipakai fan-out peserta).
 *
 * Klien ini TIDAK tahu bentuk payload — parsing/path diisolasi di adapter.js.
 */

const TIMEOUT_MS = parseInt(process.env.SIAK_V2_TIMEOUT_MS || "30000", 10);
const MAX_RETRY = parseInt(process.env.SIAK_V2_MAX_RETRY || "3", 10);

function createClient() {
  const baseURL = process.env.SIAK_V2_API_URL;
  if (!baseURL) {
    throw new Error("SIAK_V2_API_URL wajib diisi untuk sync SIAK v2.");
  }

  const headers = {};
  const apiKey = process.env.SIAK_V2_API_KEY;
  if (apiKey && apiKey.trim() !== "") {
    headers["X-API-Key"] = apiKey.trim();
  }

  return axios.create({ baseURL, timeout: TIMEOUT_MS, headers });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getWithRetry(client, url, config = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt += 1) {
    try {
      return await client.get(url, config);
    } catch (error) {
      lastError = error;
      const status = error.response && error.response.status;
      const retriable = !status || status === 429 || status >= 500;
      if (!retriable || attempt === MAX_RETRY) break;
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
    }
  }
  throw lastError;
}

module.exports = { createClient, getWithRetry };
