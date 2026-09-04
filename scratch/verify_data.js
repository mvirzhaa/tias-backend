require('dotenv').config();
const DB = require('../database');

async function verify() {
  try {
    console.log("=== Checking Mahasiswa and Parents ===");
    const resMhs = await DB.query("SELECT user_id, npm, role FROM tb_users WHERE role = 'Mahasiswa'");
    console.log(`Found ${resMhs.rows.length} Mahasiswas.`);
    resMhs.rows.forEach(r => console.log(` - Mhs ID: ${r.user_id}, NPM: ${r.npm}`));

    const resParents = await DB.query("SELECT id, npm, email, nama_lengkap FROM tb_parents");
    console.log(`\nFound ${resParents.rows.length} Parents.`);
    resParents.rows.forEach(p => console.log(` - Parent ID: ${p.id}, NPM: ${p.npm}, Name: ${p.nama_lengkap}`));

    const resTrx = await DB.query("SELECT * FROM trx_parent_mhs");
    console.log(`\nFound ${resTrx.rows.length} Parent-Student connections.`);
    resTrx.rows.forEach(t => console.log(` - Link: Parent ${t.parent_id} -> Mhs ${t.mhs_id}`));

    console.log("\n=== Checking Mata Kuliah & Pembelajaran ===");
    const resMk = await DB.query("SELECT id, kode_matakuliah, nama_matakuliah FROM m_matakuliah");
    console.log(`Found ${resMk.rows.length} Courses.`);
    resMk.rows.forEach(m => console.log(` - Course ID: ${m.id}, Code: ${m.kode_matakuliah}, Name: ${m.nama_matakuliah}`));

    const resPemb = await DB.query("SELECT COUNT(*) FROM pembelajaran_dosen_ext");
    console.log(`Found ${resPemb.rows[0].count} Pembelajaran rows.`);

    console.log("\n=== Checking Attendance for Parents Query ===");
    // Parent NPM and Course Code to test
    const testNpm = '221106043033';
    const testKode = 'TIF191';

    console.log(`Testing query for NPM: ${testNpm}, Course: ${testKode}`);
    const query = `
      SELECT am.status_absen, am.created_at, p.pertemuan, mk.nama_matakuliah, am.upload_dok 
      FROM absensi_mhs am 
      JOIN pembelajaran_dosen_ext p ON am.id_pembelajaran = p.id 
      JOIN m_matakuliah mk ON p.id_matkul = mk.id 
      JOIN tb_users u ON am.id_mhs = u.user_id
      WHERE u.npm = $1 AND mk.kode_matakuliah = $2 
      ORDER BY p.pertemuan ASC
    `;
    const dataAbsensi = await DB.query(query, [testNpm, testKode]);
    console.log(`Found ${dataAbsensi.rows.length} attendance records for ${testNpm} in ${testKode}.`);
    if (dataAbsensi.rows.length > 0) {
      console.log("Sample records:");
      dataAbsensi.rows.slice(0, 3).forEach(row => {
        console.log(` - Pertemuan: ${row.pertemuan}, Status: ${row.status_absen}, Matkul: ${row.nama_matakuliah}`);
      });
    }

  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    process.exit(0);
  }
}

verify();
