const axios = require('axios');

async function checkJadwal() {
  const url = 'https://api-siak.uika-bogor.ac.id/api/dosen/jadwal-akademik/minggu';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTdlZWIxLTgzNmQtNzU5ZC04NmRiLTc2OGEyOGVlNDAwYyIsInVzZXJuYW1lIjoiZmV0eV9mYXRpbWFoIiwiaWF0IjoxNzgwOTEyNjU1LCJleHAiOjE3ODM1MDQ2NTV9.IXs2RRQJif38fUzn2CYuKzwYMHiqus27_NSHghdg5xg';

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("=== Jadwal Berhasil Diambil ===");
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error("=== Gagal Mengambil Jadwal ===");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

checkJadwal();
