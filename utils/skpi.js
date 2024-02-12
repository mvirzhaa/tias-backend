const axios = require('axios');

async function getPrestasi(){
  const API_URL = `${process.env.API_URL_SKPI}/index.php?menu=prestasi`;
  try {
    const response = await axios.get(API_URL);

    const results = response.data.Hasil;

    const filteredResults = results.filter(entry => entry.prodi === "Teknik Informatika");
    return filteredResults;
  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

module.exports = {
  getPrestasi
};
