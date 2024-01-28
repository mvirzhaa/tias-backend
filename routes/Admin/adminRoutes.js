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
  getDataRwytPekerjaanAprove,
  getDataRwytPekerjaanReject,
  getDataPendFormalAprove,
  getDataPendFormalReject,
  getDataSertiAprove,
  getDataSertiReject,
  getDataTesAprove,
  getDataTesReject,
  getDataAnggotaProfesiAprove,
  getDataAnggotaProfesiReject,
  getDataPenghargaanAprove,
  getDataPenghargaanReject,
  getDataPengabdianAprove,
  getDataPengabdianReject,
  getDataPembicaraAprove,
  getDataPembicaraReject,
  getDataPenelitianAprove,
  getDataPenelitianReject,
  getDataPublikasiAprove,
  getDataPublikasiReject,
  getDataHkiAprove,
  getDataHkiReject,
  getDataIpAprove,
  getDataIpReject,
  getDataKepangkatanDosenProses,
  getDataKepangkatanDosenAprove,
  getDataKepangkatanDosenReject,
  getDataJafungDosenProses,
  getDataJafungDosenAprove,
  getDataJafungDosenReject,
  getDataBahanAjarDosenProses,
  getDataBahanAjarDosenAprove,
  getDataBahanAjarDosenReject,
  getDataBimbinganProses,
  getDataBimbinganAprove,
  getDataBimbinganReject,
  getAllDataIp,
} = require("../../controllers/Admin/adminController");

const router = express.Router();

// Kualifikasi
router.get(
  "/rwytPekerjaanPending",
  protected,
  adminOnly,
  getDataRwytPekerjaanProses
);
router.get(
  "/rwytPekerjaanAprove",
  protected,
  adminOnly,
  getDataRwytPekerjaanAprove
);
router.get(
  "/rwytPekerjaanReject",
  protected,
  adminOnly,
  getDataRwytPekerjaanReject
);

router.get("/pendFormalPending", protected, adminOnly, getDataPendFormalProses);
router.get("/pendFormalAprove", protected, adminOnly, getDataPendFormalAprove);
router.get("/pendFormalReject", protected, adminOnly, getDataPendFormalReject);
// End Kualifikasi

// Kompetensi
router.get("/sertifikatPending", protected, adminOnly, getDataSertiProses);
router.get("/sertifikatAprove", protected, adminOnly, getDataSertiAprove);
router.get("/sertifikatReject", protected, adminOnly, getDataSertiReject);

router.get("/tesPending", protected, adminOnly, getDataTesProses);
router.get("/tesAprove", protected, adminOnly, getDataTesAprove);
router.get("/tesReject", protected, adminOnly, getDataTesReject);
// End Kompetensi

// Penunjang
router.get(
  "/anggotaProfPending",
  protected,
  adminOnly,
  getDataAnggotaProfesiProses
);
router.get(
  "/anggotaProfAprove",
  protected,
  adminOnly,
  getDataAnggotaProfesiAprove
);
router.get(
  "/anggotaProfReject",
  protected,
  adminOnly,
  getDataAnggotaProfesiReject
);

router.get(
  "/penghargaanPending",
  protected,
  adminOnly,
  getDataPenghargaanProses
);
router.get(
  "/penghargaanAprove",
  protected,
  adminOnly,
  getDataPenghargaanAprove
);
router.get(
  "/penghargaanReject",
  protected,
  adminOnly,
  getDataPenghargaanReject
);
// End Penunjang

// Pelaks-pengabdian
router.get("/pengabdianPending", protected, adminOnly, getDataPengabdianProses);
router.get("/pengabdianAprove", protected, adminOnly, getDataPengabdianAprove);
router.get("/pengabdianReject", protected, adminOnly, getDataPengabdianReject);

router.get("/pembicaraPending", protected, adminOnly, getDataPembicaraProses);
router.get("/pembicaraAprove", protected, adminOnly, getDataPembicaraAprove);
router.get("/pembicaraReject", protected, adminOnly, getDataPembicaraReject);
// End pelaks-pengabdian

// Pelaks-penelitian
router.get("/penelitianPending", protected, adminOnly, getDataPenelitianProses);
router.get("/penelitianAprove", protected, adminOnly, getDataPenelitianAprove);
router.get("/penelitianReject", protected, adminOnly, getDataPenelitianReject);

router.get("/publikasiPending", protected, adminOnly, getDataPublikasiProses);
router.get("/publikasiAprove", protected, adminOnly, getDataPublikasiAprove);
router.get("/publikasiReject", protected, adminOnly, getDataPublikasiReject);


router.get("/hkiPending", protected, adminOnly, getDataHkiProses);
router.get("/hkiAprove", protected, adminOnly, getDataHkiAprove);
router.get("/hkiReject", protected, adminOnly, getDataHkiReject);
// End pelaks-penelitian

// Pelaks-pendidikan
router.get("/ipPending", protected, adminOnly, getDataIpProses);
router.get("/all-ip", protected, adminOnly, getAllDataIp);
router.get("/ipAprove", protected, adminOnly, getDataIpAprove);
router.get("/ipReject", protected, adminOnly, getDataIpReject);
// End Pelaks-pendidikan

// Kepangkatan
router.get("/pangkatPending", protected, adminOnly, getDataKepangkatanDosenProses);
router.get("/pangkatAprove", protected, adminOnly, getDataKepangkatanDosenAprove);
router.get("/pangkatReject", protected, adminOnly, getDataKepangkatanDosenReject);
// ENd Kepangkatan

// Jabatan Fungsional
router.get("/jafungPending", protected, adminOnly, getDataJafungDosenProses);
router.get("/jafungAprove", protected, adminOnly, getDataJafungDosenAprove);
router.get("/jafungReject", protected, adminOnly, getDataJafungDosenReject);
// ENd Jabatan Fungsional

// Bahan Ajar
router.get("/bahan-ajar-pending", protected, adminOnly, getDataBahanAjarDosenProses);
router.get("/bahan-ajar-aprove", protected, adminOnly, getDataBahanAjarDosenAprove);
router.get("/bahan-ajar-reject", protected, adminOnly, getDataBahanAjarDosenReject);
// ENd Bahan Ajar

// Bimbingan Mahasiswa
router.get("/bimbingan-pending", protected, adminOnly, getDataBimbinganProses);
router.get("/bimbingan-aprove", protected, adminOnly, getDataBimbinganAprove);
router.get("/bimbingan-reject", protected, adminOnly, getDataBimbinganReject);
// ENd Bimbingan Mahasiswa

module.exports = router;
