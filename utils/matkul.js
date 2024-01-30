const { executeQuery } = require( "../helper/informatics");


async function getMatkul(year, semester, nip){

  const query = "SELECT a.*, b.name, c.name AS dosen, b.credit FROM siak_lecture a INNER JOIN siak_course b ON b.code = a.course_code INNER JOIN siak_lecturer c ON c.code = a.lecturer_code WHERE a.academic_year = ? AND a.semester = ? AND a.department_code = 'FT_TI' AND a.curr_code = b.curr_code AND a.lecturer_code = ? ORDER BY FIND_IN_SET(a.on_day, 'Senin,Selasa,Rabu,Kamis,Jumat,Sabtu'), a.from_time, a.until_time DESC"

  try {
    const result = await executeQuery(query, [year, semester, nip]);

    const uniqueResults = {};
    
    result.forEach(item => {
      const key = `${item.class}-${item.on_day}-${item.from_time}-${item.until_time}-${item.classroom}-${item.name}`;
      if (!uniqueResults[key]) {
        uniqueResults[key] = item;
      }
    });

    const uniqueArray = Object.values(uniqueResults);

    return uniqueArray;
  } catch (error) {
    console.error('Error fetching or inserting data rekomendasi:', error);
    throw new Error('Failed to retrieve or insert data rekomendasi.');
  }
}


module.exports = {
  getMatkul,
};