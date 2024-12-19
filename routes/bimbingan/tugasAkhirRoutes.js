const express = require("express");
const {
  protected,
  adminDosenOnly,
  adminOnly,
} = require("../../middleware/authMiddleware");
const {
  pengajuanSk,
  getByUserLogin,
  getForAdmin,
  getForDosen,
  detailPengajuanSk,
  detailPengajuanSkForDosen,
  approvedStatus,
  updatePengajuanSk,
  pengajuanKolokium,
  getPengajuanKolokiumById,
  updatePengajuanKolokium,
  penilaianKolo,
  getNilaiKoloForDosen,
  getNilaiKolo,
  getPengajuanSidangById,
  pengajuanSidang,
  updatePengajuanSidang,
  penilaianSidang,
  getNilaiSidang,
  getNilaiSidangForDosen,
  getFinalSkripsi,
  uploadFinalSkripsiController,
  getNomorNota,
  updatePenilaian,
  deleteData,
  updateNilaiAkhirKolo,
  updateNilaiAkhirSidang,
  getRekapPenilaianKolokium,
  getRekapPenilaianSidang,
  updatePenilaianSidang,
  exportsRekapPenilainKolokium,
  exportRekapPenilaianSidang,
  updateKelulusan,
} = require("../../controllers/bimbingan/tugasAkhirController");
const {
  makalahKolokiumUpload,
} = require("../../middleware/tugas-akhir/makalahKolokiumUpload");
const {
  pengajuanSidangUpload,
} = require("../../middleware/tugas-akhir/pengajuanSidangUpload");
const {
  uploadFinalSkripsi,
} = require("../../middleware/tugas-akhir/uploadFinalSkripsi");

const router = express.Router();

router.post("/", protected, pengajuanSk);
router.get("/detail/:id", protected, detailPengajuanSk);
router.get("/detail-for-bimbingan/:id", protected, detailPengajuanSk);
router.get("/detail-for-dosen/:id", protected, detailPengajuanSkForDosen);
router.get("/get-by-mhs", protected, getByUserLogin);
router.get("/get-for-admin", protected, getForAdmin);
router.get("/get-for-dosen", protected, getForDosen);
router.put("/approve/:id", protected, approvedStatus);
router.patch("/update-sk/:id", protected, updatePengajuanSk);
router.put("/update-kelulusan/:id", protected, updateKelulusan);

// KOLOKIUM
router.get("/detail-pengajuan-kolo/:id", protected, getPengajuanKolokiumById);
router.get("/detail-penilaian-kolo/:id", protected, getNilaiKolo);
router.get("/detail-penilaian-kolo-dosen/:id", protected, getNilaiKoloForDosen);
router.patch(
  "/pengajuan-kolokium/:id",
  protected,
  makalahKolokiumUpload,
  pengajuanKolokium
);
router.patch(
  "/update-pengajuan-kolokium/:id",
  protected,
  makalahKolokiumUpload,
  updatePengajuanKolokium
);
router.post("/penilaian-kolo", protected, penilaianKolo);

// SIDANG
router.get("/detail-pengajuan-sidang/:id", protected, getPengajuanSidangById);
router.patch(
  "/pengajuan-sidang/:id",
  protected,
  pengajuanSidangUpload,
  pengajuanSidang
);
router.patch(
  "/update-pengajuan-sidang/:id",
  protected,
  pengajuanSidangUpload,
  updatePengajuanSidang
);
router.post("/penilaian-sidang", protected, penilaianSidang);
router.get("/detail-penilaian-sidang/:id", protected, getNilaiSidang);
router.get(
  "/detail-penilaian-sidang-dosen/:id",
  protected,
  getNilaiSidangForDosen
);

// Final Skripsi
router.get("/detail-dokumen-skripsi/:id", protected, getFinalSkripsi);
router.patch(
  "/upload-final-skripsi/:id",
  protected,
  uploadFinalSkripsi,
  uploadFinalSkripsiController
);

router.post("/get-nomor-nota", protected, getNomorNota);
router.put("/update-nilai/:id", protected, adminDosenOnly, updatePenilaian);
router.put(
  "/update-nilai-sidang/:id",
  protected,
  adminDosenOnly,
  updatePenilaianSidang
);
router.delete("/:id", protected, deleteData);
router.put("/nilai-akhir-kolo/:id", protected, updateNilaiAkhirKolo);
router.put("/nilai-akhir-sidang/:id", protected, updateNilaiAkhirSidang);

router.get(
  "/rekap-nilai-kolo",
  protected,
  adminOnly,
  getRekapPenilaianKolokium
);
router.get(
  "/export-nilai-kolo",
  protected,
  adminOnly,
  exportsRekapPenilainKolokium
);

router.get(
  "/rekap-nilai-sidang",
  protected,
  adminOnly,
  getRekapPenilaianSidang
);

router.get(
  "/export-nilai-sidang",
  protected,
  adminOnly,
  exportRekapPenilaianSidang
);

module.exports = router;
