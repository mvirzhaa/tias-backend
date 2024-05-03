const { default: axios } = require("axios");
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

async function getPmmStudent(npm) {
  const API_URL = `${process.env.API_URL_SKPI}/index.php`;

  try {
    const response = await axios.get(API_URL, {
      params: {
        menu: "mahasiswa-pmm",
        academic_year: "2023/2024",
        semester: "GENAP",
        code: npm,
      },
    });

    return response.data.Data;
  } catch (error) {}
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

async function getDepartemen() {
  const query = "SELECT * FROM siak_department";
  try {
    const results = await executeQuery(query);
    return results;
  } catch (error) {
    throw new Error("failed to retrieve data.");
  }
}

async function getMatkulKp(npm) {
  const query = `SELECT * FROM siak_frs WHERE student_code = '${npm}' AND course_code = 'IFK325';`;

  try {
    const results = await executeQuery(query);
    return results[0];
  } catch (error) {
    throw new Error("failed to retrieve  kerja praktikum.");
  }
}

async function getAllMatkulByMhs(npm) {
  const query = `SELECT SUM(siak_course.credit) AS total_credit
  FROM siak_frs
  LEFT JOIN siak_course ON siak_frs.course_code = siak_course.code
  WHERE student_code = '${npm}' AND siak_course.department_code = 'FT_TI' AND siak_course.active = "Y" AND siak_course.curr_code = 'TIF2018';`;

  try {
    const results = await executeQuery(query);
    return results[0];
  } catch (error) {
    throw new Error("failed to retrieve all matkul by mhs");
  }
}

module.exports = {
  executeQuery,
  getInformaticsStudent,
  getDosen,
  getPmmStudent,
  getDepartemen,
  getMatkulKp,
  getAllMatkulByMhs,
};
