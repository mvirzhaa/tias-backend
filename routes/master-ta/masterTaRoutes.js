const express = require("express");
const { protected, adminOnly, mhsOnly, dosenOnly } = require("../../middleware/authMiddleware");
const SkemaController = require("../../controllers/master-ta/skemaController");
const TahapanController = require("../../controllers/master-ta/tahapanController");
const PenilaianController = require("../../controllers/master-ta/penilaianController");
const ProdiController = require("../../controllers/master-ta/prodiController");
const PengajuanController = require("../../controllers/master-ta/pengajuanController");
const KelengkapanController = require("../../controllers/master-ta/kelengkapanController");
const PelaksanaanController = require("../../controllers/master-ta/pelaksanaanController");
const LegacyDiagnosticController = require("../../controllers/master-ta/legacyDiagnosticController");

const router = express.Router();

// SEMENTARA - diagnostik read-only skema tabel sistem TA lama (kolokium/sidang),
// dipakai buat desain penyatuan dgn Pengajuan/Pelaksanaan TA baru. Hapus setelah
// penyatuan selesai didesain & diimplementasikan.
router.get("/_debug/legacy-schema", protected, adminOnly, LegacyDiagnosticController.legacySchema);
// SEMENTARA - simulasi backfill 335 mhs lama ke Skema/Tahapan TA baru. Murni baca
// (hitung & laporkan), TIDAK menulis apa pun. Hapus bareng endpoint di atas.
router.get(
  "/_debug/legacy-backfill-simulation",
  protected,
  adminOnly,
  LegacyDiagnosticController.legacyBackfillSimulation
);

// Prodi (dari data SIAK v2) — dipakai dropdown di layar admin DAN form Pengajuan TA mahasiswa
router.get("/prodi", protected, ProdiController.index);

// Skema TA
router.get("/skema", protected, adminOnly, SkemaController.index);
router.get("/skema/all", protected, SkemaController.listAll);
router.get("/skema/:id", protected, adminOnly, SkemaController.detail);
router.post("/skema", protected, adminOnly, SkemaController.create);
router.put("/skema/:id", protected, adminOnly, SkemaController.update);
router.delete("/skema/:id", protected, adminOnly, SkemaController.destroy);

// Tahapan TA
router.get("/tahapan", protected, adminOnly, TahapanController.index);
router.get("/tahapan/:id", protected, adminOnly, TahapanController.detail);
router.post("/tahapan", protected, adminOnly, TahapanController.create);
router.put("/tahapan/:id", protected, adminOnly, TahapanController.update);
router.delete("/tahapan/:id", protected, adminOnly, TahapanController.destroy);

// Model Penilaian TA
router.get("/penilaian", protected, adminOnly, PenilaianController.index);
router.get("/penilaian/:id", protected, adminOnly, PenilaianController.detail);
router.post("/penilaian", protected, adminOnly, PenilaianController.create);
router.put("/penilaian/:id", protected, adminOnly, PenilaianController.update);
router.delete("/penilaian/:id", protected, adminOnly, PenilaianController.destroy);

// Kelengkapan TA (per tahapan)
router.get("/kelengkapan", protected, adminOnly, KelengkapanController.index);
router.post("/kelengkapan", protected, adminOnly, KelengkapanController.create);
router.put("/kelengkapan/:id", protected, adminOnly, KelengkapanController.update);
router.delete("/kelengkapan/:id", protected, adminOnly, KelengkapanController.destroy);

// Pelaksanaan TA (progres mahasiswa setelah pengajuan disetujui)
router.get("/pelaksanaan/me", protected, mhsOnly, PelaksanaanController.myCurrent);
router.put(
  "/pelaksanaan/me/kelengkapan",
  protected,
  mhsOnly,
  PelaksanaanController.submitKelengkapan
);
router.get(
  "/pelaksanaan/me/:id/tahapan/:tahapanId",
  protected,
  mhsOnly,
  PelaksanaanController.tahapanDetailForMahasiswa
);
router.get("/pelaksanaan/dosen", protected, dosenOnly, PelaksanaanController.indexForDosen);
router.get("/pelaksanaan/dosen/:id", protected, dosenOnly, PelaksanaanController.detailForDosen);
router.get(
  "/pelaksanaan/dosen/:id/tahapan/:tahapanId",
  protected,
  dosenOnly,
  PelaksanaanController.tahapanDetailForDosen
);
router.put(
  "/pelaksanaan/dosen/:id/tahapan/:tahapanId/penilaian",
  protected,
  dosenOnly,
  PelaksanaanController.submitPenilaianTahapan
);
router.get("/pelaksanaan", protected, adminOnly, PelaksanaanController.index);
router.get("/pelaksanaan/:id", protected, adminOnly, PelaksanaanController.detail);
router.get(
  "/pelaksanaan/:id/tahapan/:tahapanId",
  protected,
  adminOnly,
  PelaksanaanController.tahapanDetail
);
router.put(
  "/pelaksanaan/:id/tahapan/:tahapanId/meta",
  protected,
  adminOnly,
  PelaksanaanController.updateMeta
);
router.put("/pelaksanaan/:id/advance", protected, adminOnly, PelaksanaanController.advance);
router.delete("/pelaksanaan/:id", protected, adminOnly, PelaksanaanController.destroy);

// Tabel gabungan (sistem lama + dinamis, dgn kolom skema) - menggantikan tab
// "Dinamis" terpisah di halaman Pelaksanaan TA admin & dosen.
router.get(
  "/pelaksanaan-gabungan",
  protected,
  adminOnly,
  PelaksanaanController.indexGabungan
);
router.get(
  "/pelaksanaan-gabungan/dosen",
  protected,
  dosenOnly,
  PelaksanaanController.indexGabunganForDosen
);
router.get(
  "/pelaksanaan-gabungan/me",
  protected,
  mhsOnly,
  PelaksanaanController.indexGabunganForMahasiswa
);

// Pengajuan TA
router.post("/pengajuan", protected, mhsOnly, PengajuanController.create);
router.get("/pengajuan/me", protected, mhsOnly, PengajuanController.myList);
router.put("/pengajuan/me/:id", protected, mhsOnly, PengajuanController.updateMine);
router.get("/pengajuan", protected, adminOnly, PengajuanController.index);
router.get("/pengajuan/:id", protected, adminOnly, PengajuanController.detail);
router.put("/pengajuan/:id", protected, adminOnly, PengajuanController.update);
router.put(
  "/pengajuan/:id/status",
  protected,
  adminOnly,
  PengajuanController.updateStatus
);
router.delete("/pengajuan/:id", protected, adminOnly, PengajuanController.destroy);

module.exports = router;
