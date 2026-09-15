const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const DB = require("../database");
const { unixTimestamp, convertDate } = require("../utils");
const { getInformaticsStudent, getDosen } = require("./informatics");
const { getIp } = require("./ipk");

/**
 * Auto-provision user TIAS (tb_users + tb_data_pribadi) dari data akademik SIAK/SIMPEG,
 * dipakai saat login SSO E-Portal berhasil tapi user belum terdaftar di TIAS.
 * Logic insert-nya sengaja disamakan persis dengan controllers/Authentication/authController.js
 * (exports.register) — supaya akun hasil auto-provision punya data selengkap akun yang
 * daftar manual, bukan cuma akun kosong buat login doang.
 *
 * Return null kalau identifier tidak ditemukan di SIAK/SIMPEG (bukan sivitas akademik sah) —
 * pemanggil (ssoRoutes) yang memutuskan cara menolaknya.
 */
async function autoProvisionFromSiak(eportalUser) {
  const identifier = eportalUser.npm || eportalUser.nip || eportalUser.nidn;
  if (!identifier || !eportalUser.email) return null;

  const randomPassword = crypto.randomBytes(24).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);
  const convert = convertDate(unixTimestamp);
  const userAgent = ["SSO-AutoProvision"];
  const email = eportalUser.email;

  if (identifier.length === 11 || identifier.length === 12) {
    return provisionMahasiswa(identifier, email, hashedPassword, userAgent, convert);
  }

  if (identifier.length >= 8 && identifier.length <= 10) {
    return provisionDosen(identifier, email, hashedPassword, userAgent, convert);
  }

  return null;
}

async function provisionMahasiswa(npm, email, hashedPassword, userAgent, convert) {
  const students = await getInformaticsStudent();
  const student = students.find((s) => s.code === npm);
  if (!student) return null;

  const saveUser = await DB.query(
    `INSERT INTO tb_users(npm, email, password, role, user_agent, created_at, curr_code, department_code, isverified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      npm,
      email,
      hashedPassword,
      process.env.ROLE_ID_MAHASISWA,
      userAgent,
      convert,
      student.curr_code,
      student.department_code,
      true,
    ]
  );

  const jenkel =
    student.sex === "LAKI-LAKI" ? "L" : student.sex === "PEREMPUAN" ? "P" : null;

  await DB.query(
    `INSERT INTO tb_data_pribadi(user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, ibu_kandung, agama, email, alamat, kota_kabupaten, no_hp, nik, created_at, kode_mhs)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      saveUser.rows[0].user_id,
      student.name,
      jenkel,
      student.birthdate,
      student.birthplace,
      student.mothers_maiden_name,
      student.religion,
      email,
      student.address,
      student.city,
      student.mobile_phone,
      student.national_id_number,
      convert,
      student.status,
    ]
  );

  // Baseline achievements + IPK — sama seperti register manual. Best-effort: kalau gagal
  // (mis. mahasiswa baru belum ada nilai sama sekali), jangan sampai gagalkan login-nya.
  try {
    const achievements = await DB.query("SELECT id FROM achievements");
    for (const row of achievements.rows) {
      await DB.query(
        "INSERT INTO user_achievements(user_id, achievement_id, status) VALUES ($1, $2, $3)",
        [saveUser.rows[0].user_id, row.id, 0]
      );
    }
    await getIp(saveUser.rows[0].user_id, npm);
  } catch (err) {
    console.error("[SSO-AUTOPROVISION] Baseline data mahasiswa gagal (non-fatal):", err.message);
  }

  return { user_id: saveUser.rows[0].user_id };
}

async function provisionDosen(nidnOrNip, email, hashedPassword, userAgent, convert) {
  const dosens = await getDosen();
  const dosen = dosens.find((d) => d.nidn === nidnOrNip || d.nip === nidnOrNip);
  if (!dosen) return null;

  const saveUser = await DB.query(
    `INSERT INTO tb_users(nidn, email, password, role, user_agent, created_at, department_code, isverified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      nidnOrNip,
      email,
      hashedPassword,
      process.env.ROLE_ID_DOSEN,
      userAgent,
      convert,
      dosen.lookup_id,
      true,
    ]
  );

  const jenkel =
    dosen.jenis_kelamin === "LAKI-LAKI" ? "L" : dosen.jenis_kelamin === "PEREMPUAN" ? "P" : null;
  const statusKawin = dosen.status_sipil !== "MENIKAH" ? 0 : 1;

  await DB.query(
    `INSERT INTO tb_data_pribadi(user_id, nama_lengkap, jenkel, tanggal_lahir, tempat_lahir, ibu_kandung, agama, email, alamat, kota_kabupaten, no_hp, provinsi, kode_pos, status_kawin, nik, created_at, kode_mhs, nip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      saveUser.rows[0].user_id,
      `${dosen.gelar_depan} ${dosen.nama} ${dosen.gelar_belakang}`,
      jenkel,
      dosen.tanggal_lahir,
      dosen.tempat_lahir,
      dosen.nama_ibu_kandung,
      dosen.agama,
      email,
      dosen.alamat,
      dosen.kota,
      dosen.no_handphone,
      dosen.propinsi,
      dosen.kodepos,
      statusKawin,
      dosen.no_ktp,
      convert,
      dosen.klasi_pegawai,
      dosen?.nip,
    ]
  );

  return { user_id: saveUser.rows[0].user_id };
}

module.exports = { autoProvisionFromSiak };
