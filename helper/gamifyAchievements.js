const DB = require('../database');

async function gamifyAchievements() {
  try {
    const kodeValuesQuery = await DB.query("SELECT kode FROM achievements");
    const kodeValues = kodeValuesQuery.rows.map(row => row.kode);

    const result = {};

    await Promise.all(kodeValues.map(async (kode) => {
      const queryResult = await DB.query("SELECT * FROM achievements WHERE kode = $1", [kode]);
      result[kode.toLowerCase()] = queryResult.rows[0];
    }));

    return result;
  } catch (error) {
    console.error('Error fetching or delete data:', error.message);
    throw new Error('Failed to retrieve or delete data.');
  }
}


module.exports = {
  gamifyAchievements
};
