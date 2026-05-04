const axios = require('axios');


async function getSertifikasi(npm){
  const API_URL = `${process.env.API_URL_SKPI}/index.php?menu=detailsertifikasi&code=${npm}`;
  try {
    const response = await axios.get(API_URL);

    const results = response.data.Hasil;

    const filteredResults = results.filter(entry => entry.getData != "1");
    return filteredResults;

  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

async function getTestBahasaAsing(npm){
  const API_URL = `${process.env.API_URL_SKPI}/index.php?menu=detailbahasa&code=${npm}`;
  try {
    const response = await axios.get(API_URL);

    const results = response.data.Hasil;

    const filteredResults = results.filter(entry => entry.getData != "1");
    return filteredResults;

  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

async function getPengalamanOrganisasi(npm){
  const API_URL = `${process.env.API_URL_SKPI}/index.php?menu=detailorganisasi&code=${npm}`;
  try {
    const response = await axios.get(API_URL);

    const results = response.data.Hasil;


    const filteredResults = results.filter(entry => entry.getData != "1");
    return filteredResults;

  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

async function getPrestasi(npm){
  const API_URL = `${process.env.API_URL_SKPI}/index.php?menu=detailprestasi&code=${npm}`;
  try {
    const response = await axios.get(API_URL);

    const results = response.data.Hasil;


    const filteredResults = results.filter(entry => entry.getData != "1");
    return filteredResults;

  } catch (error) {
    throw new Error("failed to retrieve prestasi data.");
  }
}

module.exports = {
  getSertifikasi,
  getTestBahasaAsing,
  getPengalamanOrganisasi,
  getPrestasi
};
