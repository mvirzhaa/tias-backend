const { executeQuery } = require("../helper/informatics");

async function getMatkul(year, semester, nip) {
  const query =
    "SELECT a.*, b.name, c.name AS dosen, b.credit FROM siak_lecture a INNER JOIN siak_course b ON b.code = a.course_code INNER JOIN siak_lecturer c ON c.code = a.lecturer_code WHERE a.academic_year = ? AND a.semester = ?  AND a.curr_code = b.curr_code AND a.lecturer_code = ? ORDER BY FIND_IN_SET(a.on_day, 'Senin,Selasa,Rabu,Kamis,Jumat,Sabtu'), a.from_time, a.until_time DESC";

  try {
    const result = await executeQuery(query, [year, semester, nip]);

    const uniqueResult = removeDuplicates(result, ["name", "class"]);

    return uniqueResult;
  } catch (error) {
    console.error("Error fetching or inserting data rekomendasi:", error);
    throw new Error("Failed to retrieve or insert data rekomendasi.");
  }
}

function removeDuplicates(array, keys) {
  const seen = new Set();
  return array.filter((item) => {
    const key = keys.map((key) => item[key]).join("|");
    if (!seen.has(key)) {
      seen.add(key);
      return true;
    }
    return false;
  });
}

async function getClass() {
  const code = "FT";
  const query = "SELECT name FROM siak_class WHERE faculty_code = ?";

  try {
    const result = await executeQuery(query, [code]);

    return result;
  } catch (error) {
    console.error("Error fetching or inserting data kelas:", error);
    throw new Error("Failed to retrieve or insert data kelas.");
  }
}

module.exports = {
  getMatkul,
  getClass,
};
