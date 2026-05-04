const { default: axios } = require("axios");
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.SIAK_DB_HOST,
  user: process.env.SIAK_DB_USERNAME,
  password: process.env.SIAK_DB_PASSWORD,
  database: process.env.SIAK_DB_DATABASE,
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

async function getInformaticsStudent() {
  const query = "SELECT * FROM siak_student";
  try {
    const results = await executeQuery(query);
    return results;
  } catch (error) {
    throw new Error("failed to retrieve student data.");
  }
}

async function getInformaticsStudentBeasiswa() {
  const query =
    "SELECT * FROM siak_student WHERE AND funding_scheme != 'MANDIRI'";
  try {
    const results = await executeQuery(query);
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
        academic_year: "2024/2025",
        semester: "GASAL",
        code: npm,
      },
    });

    return response.data.Data;
  } catch (error) {}
}

async function getDosen() {
  // const query =
  //   "SELECT adm_lookup.lookup_id, adm_lookup.lookup_value, simpeg_pegawai.* FROM simpeg_pegawai JOIN adm_lookup ON adm_lookup.lookup_id = simpeg_pegawai.division WHERE adm_lookup.lookup_name = 'DIVISION' AND simpeg_pegawai.klasi_pegawai = 'PENDIDIK (DOSEN)' AND adm_lookup.lookup_id != 'AKADEMIK' AND simpeg_pegawai.status_kerja = 'AKTIF'";
  const query =
    "SELECT adm_lookup.lookup_id, adm_lookup.lookup_value, simpeg_pegawai.* FROM simpeg_pegawai JOIN adm_lookup ON adm_lookup.lookup_id = simpeg_pegawai.division";
  try {
    const results = await executeQuery(query);
    return results;
  } catch (error) {
    throw new Error("failed to retrieve data.");
  }
}

async function getPegawai() {
  const query =
    "SELECT adm_lookup.lookup_id, adm_lookup.lookup_value, simpeg_pegawai.* FROM simpeg_pegawai JOIN adm_lookup ON adm_lookup.lookup_id = simpeg_pegawai.division WHERE adm_lookup.lookup_name = 'DIVISION' AND simpeg_pegawai.klasi_pegawai = 'TENAGA KEPENDIDIKAN' AND adm_lookup.lookup_id != 'AKADEMIK' AND simpeg_pegawai.status_kerja = 'AKTIF'";
  try {
    const results = await executeQuery(query);
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

async function getMatkulKp(npm, curr_code) {
  let courseCode;

  if (curr_code === "TIF2015") {
    courseCode = "IFK432";
  } else if (curr_code == "TIF2018") {
    courseCode = "IFK325";
  } else if (curr_code == "TIF2021") {
    courseCode = "TIF392";
  }

  const query = `SELECT * FROM siak_frs WHERE student_code = '${npm}' AND course_code = '${courseCode}';`;

  try {
    const results = await executeQuery(query);
    return results[0];
  } catch (error) {
    throw new Error("failed to retrieve  kerja praktikum.");
  }
}

async function getAllMatkulByMhs(npm, curr_code) {
  const query = `SELECT SUM(siak_course.credit) AS total_credit
  FROM siak_frs
  LEFT JOIN siak_course ON siak_frs.course_code = siak_course.code
  WHERE student_code = '${npm}' AND siak_course.active = "Y" AND siak_course.curr_code = '${curr_code}';`;

  try {
    const results = await executeQuery(query);

    return results[0];
  } catch (error) {
    throw new Error("failed to retrieve all matkul by mhs");
  }
}

async function getMatkulByNpm(npm, semester = "GASAL", tahun = "2024/2025") {
  const query = `
    SELECT a.*, d.student_code, e.name AS mahasiswa, b.name, c.name AS dosen, b.credit 
    FROM siak_lecture a 
    INNER JOIN siak_course b ON b.code=a.course_code 
    INNER JOIN siak_lecturer c ON c.code=a.lecturer_code
    INNER JOIN siak_frs d ON d.course_code=a.course_code
    INNER JOIN siak_student e ON e.code=d.student_code
    WHERE a.academic_year='${tahun}' 
      AND a.semester='${semester}' 
      AND d.curr_code=a.curr_code
      AND a.curr_code=b.curr_code 
      AND d.class=a.class 
      AND d.student_code='${npm}'
    ORDER BY FIND_IN_SET(a.on_day, 'Senin,Selasa,Rabu,Kamis,Jumat,Sabtu'), a.from_time, a.until_time DESC
  `;

  try {
    const rows = await executeQuery(query, [npm]);

    if (rows.length > 0) {
      let totalsks = 0;
      const results = {
        Status: {
          success: true,
          code: 200,
          description: "Request Valid",
        },
        npm: rows[0].student_code,
        mahasiswa: rows[0].mahasiswa,
        Total: rows.length,
        SKS: 0, // will be calculated below
        Data: [],
      };

      rows.forEach((row) => {
        totalsks += row.credit;
        results.Data.push({
          course_code: row.course_code,
          curr_code: row.curr_code,
          name: row.name,
          sks: row.credit,
          class: row.class,
          dosen: row.dosen,
          day: row.on_day,
          from_time: row.from_time,
          until_time: row.until_time,
          class_room: row.classroom,
        });
      });

      results.SKS = totalsks;
      return results;
    } else {
      return {
        Status: {
          success: false,
          code: 400,
          description: "Request Invalid",
        },
        Hasil: [],
      };
    }
  } catch (error) {
    throw new Error("failed to retrieve matkul by npm: " + error.message);
  }
}

module.exports = {
  executeQuery,
  getInformaticsStudent,
  getDosen,
  getPegawai,
  getPmmStudent,
  getDepartemen,
  getMatkulKp,
  getAllMatkulByMhs,
  getInformaticsStudentBeasiswa,
  getMatkulByNpm,
};
