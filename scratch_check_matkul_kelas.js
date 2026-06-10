require('dotenv').config();
const db = require('./models');
const Matakuliah = require('./models/master/Matakuliah');
const SiakClass = require('./models/Siak/Class');

async function check() {
  try {
    const matkul = await Matakuliah.findOne({ raw: true });
    console.log("=== 1 Baris m_matakuliah (Lokal UCL) ===");
    console.log(matkul);

    try {
      const kelasLocal = await SiakClass.findOne({ raw: true });
      console.log("\n=== 1 Baris siak_class (Lokal UCL Sinkronisasi) ===");
      console.log(kelasLocal);
    } catch(e) {
      console.log("\nFailed to query SiakClass", e.message);
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
