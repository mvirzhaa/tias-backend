const asyncHandler = require("express-async-handler");
const { getSertifikasi } = require("../../utils/skpi");
const DB = require("../../database");
const { getKategoriSertifikasi } = require("../../utils/kategori");
const { unixTimestamp, convertDate } = require("../../utils");
const axios = require("axios");
const qs = require('querystring');

async function rollbackInsertedData(userId, result) {
  return new Promise(async (resolve, reject) => {
    try {
      const deleteQuery = await DB.query("DELETE FROM tb_sertifikasi WHERE user_id = $1 AND nama_serti = $2", [userId, result.nama_sertifikasi]);
      
      console.log("Data yang berhasil dimasukkan telah dirollback");
      resolve(); 
    } catch (error) {
      console.error("Gagal melakukan rollback:", error.message);
      reject(error);
    }
  });
}


exports.getSertifikasiSkpi = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const npm = req.user.npm;

  try {
    const results = await getSertifikasi(npm);

    if (results && results.length > 0) {
      const created_at = unixTimestamp;
      const convert = convertDate(created_at);
      const kategoriSertifikasi = await getKategoriSertifikasi();

      const urlUpdate = `${process.env.API_URL_SKPI}/index.php?menu=updatesertifikasi`;
      const currentYear = new Date().getFullYear(); 
      const tanggalSertifikasi = new Date(currentYear, 0, 1); 

      const promises = results.map(async (result) => {
        let insertSuccess = false;
        let updateSuccess = false;
        
          let kategoriId;
          if (result.lingkup === "Nasional") {
            kategoriId = kategoriSertifikasi.find(kategori => kategori.kode === "NL").id;
          } else if (result.lingkup === "Internasional") {
            kategoriId = kategoriSertifikasi.find(kategori => kategori.kode === "IL").id;
          } else if (result.lingkup === "Lokal") {
            kategoriId = kategoriSertifikasi.find(kategori => kategori.kode === "LK").id;
          }

          tanggalSertifikasi.setFullYear(result.tahun);

          const tanggalISO = tanggalSertifikasi.toISOString();

          
          await DB.query("INSERT INTO tb_sertifikasi(user_id, kategori_id, nama_serti, penyelenggara, file, tgl_serti, created_at) VALUES($1, $2, $3, $4, $5, $6, $7)", [userId, kategoriId, result.nama_sertifikasi, result.penyelenggara, result.bukti_dokumen, tanggalISO, convert]);
          
          insertSuccess = true;

          const formData = {
            id: result.id,
            status_tias: 1
          };

          const updateSkpi = await axios.put(urlUpdate, qs.stringify(formData), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          updateSuccess = true;

          if (insertSuccess && !updateSuccess) {
            await rollbackInsertedData(userId, result);
          }
      });

      await Promise.all(promises);

      res.status(201).json({
        message: "Data generated successfully"
      });
    } else {
      res.status(400).send("Data Already Updated");
    }
  } catch (error) {
    console.error("Gagal insert or update skpi sertifikasi:", error);
    res.status(500).send("Failed to insert or update SKPI certification");
  }
});

