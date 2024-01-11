const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

function executeQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results, fields) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

async function getInformaticsStudent(departmentCode) {
  const query = "SELECT * FROM siak_student WHERE department_code = ?";
  try {
    const results = await executeQuery(query, [departmentCode]);
    return results;
  } catch (error) {
    throw new Error("failed to retrieve student data.");
  }
}

async function getDosen(division) {
  const query =
    "SELECT adm_lookup.lookup_id, adm_lookup.lookup_value, simpeg_pegawai.* FROM simpeg_pegawai JOIN adm_lookup ON adm_lookup.lookup_id = simpeg_pegawai.division WHERE adm_lookup.lookup_name = 'DIVISION' AND simpeg_pegawai.klasi_pegawai = 'PENDIDIK (DOSEN)' AND adm_lookup.lookup_id != 'AKADEMIK' AND simpeg_pegawai.status_kerja = 'AKTIF' AND adm_lookup.lookup_id = ?;";
  try {
    const results = await executeQuery(query, [division]);
    return results;
  } catch (error) {
    throw new Error("failed to retrieve data.");
  }
}

module.exports = {
  executeQuery,
  getInformaticsStudent,
  getDosen,
};
