const asyncHandler = require("express-async-handler");
const { getPengalamanOrganisasi, getPrestasi } = require("../../utils/skpi");
const DB = require("../../database");
const { getKategoriProfesi, getKategoriPrestasi } = require("../../utils/kategori");
const { unixTimestamp, convertDate } = require("../../utils");
const axios = require("axios");
const qs = require('querystring');


async function rollbackInsertedData(db, query, value) {
  await DB.query(`DELETE FROM ${db} WHERE ${query} = $1`, [value]);
 console.log("Data yang berhasil dimasukkan telah dirollback");
}

exports.getPengalamanOrganisasiSkpi = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const npm = req.user.npm;

  try {
    const results = await getPengalamanOrganisasi(npm);

    if (results && results.length > 0) {
      const created_at = unixTimestamp;
      const convert = convertDate(created_at);
      const kategoriProfesi = await getKategoriProfesi();

      const urlUpdate = `${process.env.API_URL_SKPI}/index.php?menu=updateorganisasi`;

      const promises = results.map(async (result) => {
          let kategoriId;
          if (result.jabatan === "Ketua") {
            kategoriId = kategoriProfesi.find(kategori => kategori.kode === "KA").id;
          } else if (result.jabatan === "Pengurus") {
            kategoriId = kategoriProfesi.find(kategori => kategori.kode === "PS").id;
          } else if (result.jabatan === "Anggota") {
            kategoriId = kategoriProfesi.find(kategori => kategori.kode === "AA").id;
          }

          
          const insertResult = await DB.query("INSERT INTO tb_anggota_prof(user_id, kategori_id, nama_organisasi, peran, mulai_tahun, mulai_bulan, selesai_tahun, selesai_bulan, file, created_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING prof_id", [userId, kategoriId, result.nama_organisasi, result.jabatan, result.mulai_tahun, result.mulai_bulan, result.selesai_tahun, result.selesai_bulan, result.bukti_dokumen, convert]);

          const insertedId = insertResult.rows[0].prof_id;
          
          const formData = {
            id: result.id,
            status_tias: 1
          };

          const updateSkpi = await axios.put(urlUpdate, qs.stringify(formData), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          // if (insertSuccess && !updateSkpi.data.Hasil) {
          //   await rollbackInsertedData('tb_sertifikasi', 'sertifikat_id', insertedId);
          // }
      });

      await Promise.all(promises);

      res.status(201).json({
        message: "Data generated successfully"
      });
    } else {
      res.status(400).send("Data Already Updated");
    }
  } catch (error) {
    console.error("Gagal insert or update skpi profesi organisasi:", error);
    res.status(500).send("Failed to insert or update SKPI profesi organisasi");
  }
});

exports.getPrestasiSkpi = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const npm = req.user.npm;

  try {
    const results = await getPrestasi(npm);

    if (results && results.length > 0) {
      const created_at = unixTimestamp;
      const convert = convertDate(created_at);
      const kategoriPrestasi = await getKategoriPrestasi();

      const urlUpdate = `${process.env.API_URL_SKPI}/index.php?menu=updateprestasi`;

      const promises = results.map(async (result) => {
          let kategoriId;
          if (result.lingkup === "Internasional" && result.peringkat === "1") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "IL1").id;
          } else if (result.lingkup === "Internasional" && result.peringkat === "2") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "IL2").id;
          } else if (result.lingkup === "Internasional" && result.peringkat === "3") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "IL3").id;
          } else if (result.lingkup === "Nasional" && result.peringkat === "1") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "NL1").id;
          } else if (result.lingkup === "Nasional" && result.peringkat === "2") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "NL2").id;
          } else if (result.lingkup === "Nasional" && result.peringkat === "3") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "NL3").id;
          } else if (result.lingkup === "Lokal" && result.peringkat === "1") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "LK1").id;
          } else if (result.lingkup === "Lokal" && result.peringkat === "2") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "LK2").id;
          } else if (result.lingkup === "Lokal" && result.peringkat === "3") {
            kategoriId = kategoriPrestasi.find(kategori => kategori.kode === "LK3").id;
          } 

          
          const insertResult = await DB.query("INSERT INTO tb_penghargaan(user_id, kategori_id, jenis_peng, tahun_peng, instansi_pemberi, tingkat_peng, file, created_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING penghargaan_id", [userId, kategoriId, result.jenis_prestasi, result.tahun, result.penyelenggara, result.lingkup, result.bukti_dokumen, convert]);

          const insertedId = insertResult.rows[0].penghargaan_id;
          
          const formData = {
            id: result.id,
            status_tias: 1
          };

          const updateSkpi = await axios.put(urlUpdate, qs.stringify(formData), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          // if (insertSuccess && !updateSkpi.data.Hasil) {
          //   await rollbackInsertedData('tb_sertifikasi', 'sertifikat_id', insertedId);
          // }
      });

      await Promise.all(promises);

      res.status(201).json({
        message: "Data generated successfully"
      });
    } else {
      res.status(400).send("Data Already Updated");
    }
  } catch (error) {
    console.error("Gagal insert or update skpi prestasi:", error);
    res.status(500).send("Failed to insert or update SKPI prestasi");
  }
});

