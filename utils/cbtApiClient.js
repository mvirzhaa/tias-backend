'use strict';
const axios = require('axios');

const cbtApiClient = axios.create({
  baseURL: process.env.CBT_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const exchangeToCbtToken = async ({ email, nama, nim, role }) => {
  const response = await cbtApiClient.post('/api/auth/external-login', {
    email, nama, nim, role,
    shared_secret: process.env.TIAS_CBT_SHARED_SECRET,
  });
  if (!response.data?.success) throw new Error('CBT API menolak request.');
  return {
    cbt_token: response.data.data.token,
    cbt_user_id: response.data.data.user.id,
  };
};

module.exports = { exchangeToCbtToken };