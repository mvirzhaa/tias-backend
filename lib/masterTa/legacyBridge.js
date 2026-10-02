const DB = require("../../database");
const { getMatkulKp, getAllMatkulByMhs } = require("../../helper/informatics");

// Meniru persis urutan insert di controllers/bimbingan/tugasAkhirController.js#pengajuanSk
// (jalur self-service mahasiswa yang sudah dipakai 250+ mahasiswa di sistem lama),
// supaya mahasiswa yang mengajukan lewat form Pengajuan TA baru dengan skema
// is_legacy=true masuk ke pipeline lama persis seperti mereka mendaftar lewat
// endpoint lama POST /tugas-akhir. Dibuat sebagai fungsi terpisah (bukan memanggil
// controller lama) supaya endpoint lama itu sendiri nol diubah.
async function createLegacyPengajuanSk({
  mhsId,
  npm,
  namaLengkap,
  ipk,
  currCode,
  judulSkripsi,
  lokasiKegiatan,
  semester,
  skPembimbing1,
  skPembimbing2,
  skPembimbing3,
  kepalaLab,
}) {
  const saveData = await DB.query(
    `INSERT INTO ta_pengajuan_sk(mhs_id, judul_skripsi, lokasi_kegiatan, semester, sk_pembimbing_1, sk_pembimbing_2, sk_pembimbing_3, kepala_lab, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      mhsId,
      judulSkripsi,
      lokasiKegiatan,
      semester,
      skPembimbing1,
      skPembimbing2,
      skPembimbing3 || null,
      kepalaLab,
      "pengajuan-sk",
    ]
  );
  const pengajuanSkId = saveData.rows[0].id;

  const getKp = await getMatkulKp(npm, currCode);
  let statusKp;
  if (getKp) {
    statusKp = getKp.grade != null ? true : false;
  }

  const dataSks = await getAllMatkulByMhs(npm, currCode);

  const statusSksIpk = dataSks.total_credit >= 138 && ipk >= 2.0 ? true : false;

  const insertPendaftaranKolo = await DB.query(
    `INSERT INTO ta_pendaftaran_kolokium(mhs_id, pengajuan_sk_id, status_kp, status_sks_ipk, jumlah_sks, ipk, kolo_pembimbing_1, kolo_pembimbing_2, kolo_kepala_lab, judul) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      mhsId,
      pengajuanSkId,
      statusKp,
      statusSksIpk,
      dataSks.total_credit,
      ipk,
      skPembimbing1,
      skPembimbing2,
      kepalaLab,
      judulSkripsi,
    ]
  );

  await DB.query(
    `INSERT INTO ta_nilai_akhir_kolo(kolo_id, mhs_id, nama, npm, judul, pembimbing_1, pembimbing_2) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      insertPendaftaranKolo.rows[0].id,
      mhsId,
      namaLengkap,
      npm,
      judulSkripsi,
      skPembimbing1,
      skPembimbing2,
    ]
  );

  const statusIpk = ipk >= 2.0 ? true : false;

  const insertPendaftaranSidang = await DB.query(
    `INSERT INTO ta_pendaftaran_sidang(mhs_id, pengajuan_sk_id, status_kp, jumlah_sks, status_min_ipk, ipk, sidang_pembimbing_1, sidang_pembimbing_2, sidang_kepala_lab, judul) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      mhsId,
      pengajuanSkId,
      statusKp,
      dataSks.total_credit,
      statusIpk,
      ipk,
      skPembimbing1,
      skPembimbing2,
      kepalaLab,
      judulSkripsi,
    ]
  );

  await DB.query(
    `INSERT INTO ta_nilai_akhir_sidang(sidang_id, mhs_id, nama, npm, judul, pembimbing_1, pembimbing_2) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      insertPendaftaranSidang.rows[0].id,
      mhsId,
      namaLengkap,
      npm,
      judulSkripsi,
      skPembimbing1,
      skPembimbing2,
    ]
  );

  await DB.query(
    `INSERT INTO ta_dokumen_final_skripsi(mhs_id, pengajuan_sk_id) VALUES($1, $2)`,
    [mhsId, pengajuanSkId]
  );

  await DB.query(
    `INSERT INTO ta_progres(mhs_id, pengajuan_sk_id) VALUES ($1, $2)`,
    [mhsId, pengajuanSkId]
  );

  return saveData.rows[0];
}

module.exports = { createLegacyPengajuanSk };
