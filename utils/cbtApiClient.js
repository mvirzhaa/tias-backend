'use strict';

const axios = require('axios');

const CBT_API_BASE_URL = process.env.CBT_API_BASE_URL;
const TIAS_CBT_SHARED_SECRET = process.env.TIAS_CBT_SHARED_SECRET;

if (!CBT_API_BASE_URL || !TIAS_CBT_SHARED_SECRET) {
  throw new Error('[cbtApiClient] CBT_API_BASE_URL dan TIAS_CBT_SHARED_SECRET wajib ada di .env');
}

const cbtApiClient = axios.create({
  baseURL: CBT_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Tukar identitas TIAS user ke CBT Token
 * @param {{ email: string, nama: string, nim: string|null }} userInfo
 * @returns {{ cbt_token: string, cbt_user_id: number }}
 */
const exchangeToCbtToken = async ({ email, nama, nim }) => {
  const response = await cbtApiClient.post('/api/auth/external-login', {
    email,
    nama,
    nim,
    shared_secret: TIAS_CBT_SHARED_SECRET,
  });

  if (!response.data?.success) {
    throw new Error('CBT API menolak request external login.');
  }

  return {
    cbt_token: response.data.data.token,
    cbt_user_id: response.data.data.user.id,
  };
};

module.exports = { cbtApiClient, exchangeToCbtToken };
