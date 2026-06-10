require('dotenv').config();
const axios = require('axios');

async function checkApi() {
  try {
    const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/absensi`;
    console.log("Fetching from:", API_URL);
    
    // We will try a few parameter combinations
    const params = new URLSearchParams();
    params.append('dataTable', 'true');
    params.append('limit', '5'); // Try to limit just in case

    const response = await axios.get(`${API_URL}?${params.toString()}`);

    console.log("=== SIAK API Response (absensi) ===");
    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log(JSON.stringify(response.data.data[0], null, 2));
      
      const item = response.data.data[0];
      if (item.pembelajaran) {
          console.log("\n=> Type of id_matkul in pembelajaran:", typeof item.pembelajaran.id_matkul);
      }
    } else {
      console.log(response.data);
    }
  } catch (err) {
    console.error("Error fetching absensi:", err.message);
    if (err.response) {
      console.error("Data:", err.response.data);
    }
  }

  // Let's also check list-pertemuan
  try {
    const API_URL_2 = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran/list-pertemuan`;
    console.log("\nFetching from:", API_URL_2);
    
    const params2 = new URLSearchParams();
    params2.append('dataTable', 'true');

    const response2 = await axios.get(`${API_URL_2}?${params2.toString()}`);

    console.log("=== SIAK API Response (list-pertemuan) ===");
    if (response2.data && response2.data.data && response2.data.data.length > 0) {
      console.log(JSON.stringify(response2.data.data[0], null, 2));
    } else {
      console.log(response2.data);
    }
  } catch (err) {
    console.error("Error fetching list-pertemuan:", err.message);
    if (err.response) {
      console.error("Data:", err.response.data);
    }
  }

  process.exit();
}

checkApi();
