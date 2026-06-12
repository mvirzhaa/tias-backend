require('dotenv').config();
const axios = require('axios');

async function checkApi() {
  try {
    const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/absensi`;
    console.log("Fetching from:", API_URL);
    
    // Attempting to fetch a small amount of data
    const response = await axios.get(API_URL, {
      params: {
        dataTable: false, // Maybe we can just get 1 record
      }
    });

    console.log("=== SIAK API Response Shape ===");
    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log(JSON.stringify(response.data.data[0], null, 2));
    } else {
      console.log(response.data);
    }
  } catch (err) {
    console.error("Error fetching API:", err.message);
  } finally {
    process.exit();
  }
}

checkApi();
