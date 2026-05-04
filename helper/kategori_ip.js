const DB = require('../database');

async function getKategoriIp() {
  const kodeValues = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11'];
  const result = {};

  try {
    await Promise.all(kodeValues.map(async (kode) => {
      const queryResult = await DB.query("SELECT * FROM kategori_ip WHERE kode = $1", [kode]);
      result[kode.toLowerCase()] = queryResult.rows[0];
    }));

    return result;
  } catch (error) {
    console.error('Error fetching or delete data:', error.message);
    throw new Error('Failed to retrieve or delete data.');
  }
}

module.exports = {
  getKategoriIp
};
