const axios = require('axios');

async function login() {
  const url = 'https://api-siak.uika-bogor.ac.id/api/auth/login';
  const payload = {
    username: 'fety_fatimah',
    password: 'password123'
  };

  try {
    console.log(`Mengirim request login ke: ${url}`);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log("=== Login Berhasil ===");
    const token = response.data.token || response.data.data?.token || response.data.access_token || response.data.accessToken || "Token tidak ditemukan secara langsung, lihat respons lengkap:";
    console.log(`Token: ${token}`);
    console.log("Respons Lengkap:");
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error("=== Login Gagal ===");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

login();
