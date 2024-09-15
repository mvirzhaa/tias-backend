const axios = require("axios");

async function getMkForMhs(npm) {
  const API_URL = `${process.env.API_URL_SKPI}/index.php?menu=jadwal-kuliah&academic_year=2024/2025&semester=GASAL&code=${npm}`;

  try {
    const response = await axios.get(API_URL);

    return response.data;
  } catch (error) {
    console.error("Error fetching Matakuliah For Mhs:", error.message);
    throw new Error("Failed to retrieve or delete data.");
  }
}

module.exports = {
  getMkForMhs,
};
