const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  getDataSertiProses,
  getDataTesProses,
  getDataRwytPekerjaanProses,
  getDataPendFormalProses,
  getDataAnggotaProfesiProses,
  getDataPenghargaanProses,
  getDataPengabdianProses,
  getDataPembicaraProses,
  getDataPenelitianProses,
  getDataPublikasiProses,
  getDataHkiProses,
  getDataIpProses,
  getDataKepangkatanDosen,
  getDataJafungDosen,
  getDataBahanAjarDosen,
  getDataBimbingan,
} = require("../../controllers/Admin/adminController");

const router = express.Router();

// Kualifikasi
router.get(
  "/rwytPekerjaanPending",
  protected,
  adminOnly,
  getDataRwytPekerjaanProses
);
router.get("/pendFormalPending", protected, adminOnly, getDataPendFormalProses);
// End Kualifikasi

// Kompetensi
router.get("/sertifikatPending", protected, adminOnly, getDataSertiProses);
router.get("/tesPending", protected, adminOnly, getDataTesProses);
// End Kompetensi

// Penunjang
router.get(
  "/anggotaProfPending",
  protected,
  adminOnly,
  getDataAnggotaProfesiProses
);
router.get(
  "/penghargaanPending",
  protected,
  adminOnly,
  getDataPenghargaanProses
);
// End Penunjang

// Pelaks-pengabdian
router.get("/pengabdianPending", protected, adminOnly, getDataPengabdianProses);
router.get("/pembicaraPending", protected, adminOnly, getDataPembicaraProses);
// End pelaks-pengabdian

// Pelaks-penelitian
router.get("/penelitianPending", protected, adminOnly, getDataPenelitianProses);
router.get("/publikasiPending", protected, adminOnly, getDataPublikasiProses);
router.get("/hkiPending", protected, adminOnly, getDataHkiProses);
// End pelaks-penelitian

// Pelaks-pendidikan
router.get("/ipPending", protected, adminOnly, getDataIpProses);
// End Pelaks-pendidikan

// Kepangkatan
router.get("/pangkatPending", protected, adminOnly, getDataKepangkatanDosen);
// ENd Kepangkatan

// Jabatan Fungsional
router.get("/jafungPending", protected, adminOnly, getDataJafungDosen);
// ENd Jabatan Fungsional

// Bahan Ajar
router.get("/bahan-ajar-pending", protected, adminOnly, getDataBahanAjarDosen);
// ENd Bahan Ajar

// Bimbingan Mahasiswa
router.get("/bimbingan-pending", protected, adminOnly, getDataBimbingan);
// ENd Bimbingan Mahasiswa

module.exports = router;
