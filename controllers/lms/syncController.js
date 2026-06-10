const asyncHandler = require("express-async-handler");
const db = require("../../config");
const { response } = require("../../lib/response");
const SiakService = require("../../utils/SiakService");
const SiakV2Class = require("../../models/lms/SiakV2Class");
const SiakV2Participant = require("../../models/lms/SiakV2Participant");

/**
 * SPEC v8 §4 / Fase 0 — ETL Sinkronisasi (FULL SYNC).
 *
 * `POST /lms/sync-siak` (admin) → tarik data massal kelas+peserta dari SIAK v2,
 * lalu REPLACE tabel lokal `siak_v2_classes` & `siak_v2_participants`.
 *
 * ⚠️ KERANGKA: URL endpoint massal SIAK v2 belum final (menunggu Tim SIAK / Mas
 *    Syaifullah). Selama `SIAK_V2_SYNC_URL` belum diset di .env, fungsi memakai DATA
 *    MOCK agar alur sync bisa diuji lokal. Saat URL siap: set env + sesuaikan mapping
 *    `fetchSiakV2Bulk()` ke bentuk respons asli (konfirmasi field ke Tim SIAK).
 */

// Data mock sementara — bentuk mengikuti kolom tabel agar bulkCreate langsung jalan.
const MOCK_BULK = {
  classes: [
    {
      kelasKuliahId: "11111111-1111-1111-1111-111111111111",
      kode_matakuliah: "TIF221",
      nama_matakuliah: "Pemrograman Berorientasi Obyek",
      nama_kelas: "TI-3A",
      dosen_pengampu_nip: ["410100569"],
      semester: "20241",
    },
    {
      kelasKuliahId: "22222222-2222-2222-2222-222222222222",
      kode_matakuliah: "TIF152",
      nama_matakuliah: "Basis Data",
      nama_kelas: "TI-2B",
      dosen_pengampu_nip: ["410100570", "410100571"],
      semester: "20241",
    },
  ],
  participants: [
    { kelasKuliahId: "11111111-1111-1111-1111-111111111111", npm: "0110220001" },
    { kelasKuliahId: "11111111-1111-1111-1111-111111111111", npm: "0110220002" },
    { kelasKuliahId: "22222222-2222-2222-2222-222222222222", npm: "0110210045" },
  ],
};

/**
 * Tarik data massal dari SIAK v2. Saat ini mengembalikan MOCK bila URL belum diset.
 * Token diambil dari Service Account global (SiakService), BUKAN user yang login (§4.1).
 */
async function fetchSiakV2Bulk() {
  const url = process.env.SIAK_V2_SYNC_URL;
  if (!url) {
    return { source: "mock", ...MOCK_BULK };
  }

  // TODO(SIAK): konfirmasi path & bentuk respons bulk ke Tim SIAK; sesuaikan mapping.
  await SiakService.login(); // service account global dari .env
  const resp = await SiakService.get(url);
  const body = resp.data || {};
  const root = body.data || body;
  return {
    source: "siak_v2",
    classes: root.classes || [],
    participants: root.participants || [],
  };
}

/**
 * Sinkronisasi data lokal dengan data terbaru, dalam satu transaksi.
 *
 * Kelas pakai UPSERT (BUKAN delete+reinsert): lms_sections ber-FK RESTRICT ke
 * siak_v2_classes, jadi menghapus kelas yang punya materi akan gagal/merusak. Upsert
 * mempertahankan baris kelas yang sama (kelasKuliahId) sambil memperbarui kolomnya.
 * Peserta tidak direferensikan FK lain → aman direplace penuh (delete+reinsert).
 *
 * Catatan: kelas yang HILANG dari SIAK tidak otomatis terhapus (konsekuensi upsert).
 * Pembersihan kelas usang = pekerjaan terpisah (perlu kebijakan: hanya hapus yang tak
 * punya materi). TODO bila Tim SIAK menyediakan penanda kelas nonaktif.
 */
async function syncSiakV2Data() {
  const { source, classes, participants } = await fetchSiakV2Bulk();

  await db.transaction(async (t) => {
    const now = new Date();

    if (classes.length) {
      await SiakV2Class.bulkCreate(
        classes.map((c) => ({ ...c, created_at: now, updated_at: now })),
        {
          transaction: t,
          updateOnDuplicate: [
            "kode_matakuliah",
            "nama_matakuliah",
            "nama_kelas",
            "dosen_pengampu_nip",
            "semester",
            "updated_at",
          ],
        }
      );
    }

    // Peserta: replace penuh. Kelas sudah ada (di-upsert di atas) → insert peserta aman.
    await SiakV2Participant.destroy({ where: {}, transaction: t });
    if (participants.length) {
      await SiakV2Participant.bulkCreate(
        participants.map((p) => ({ ...p, created_at: now, updated_at: now })),
        { transaction: t }
      );
    }
  });

  return {
    source,
    classes: classes.length,
    participants: participants.length,
    synced_at: new Date(),
  };
}

// POST /lms/sync-siak  (route: protected + adminOnly)
exports.syncSiak = asyncHandler(async (req, res) => {
  try {
    const result = await syncSiakV2Data();
    return response(res, true, "Sinkronisasi SIAK v2 berhasil.", result);
  } catch (error) {
    console.error("syncSiak: gagal sinkronisasi:", error.message);
    return response(res, false, `Sinkronisasi gagal: ${error.message}`, null, 502);
  }
});

exports.syncSiakV2Data = syncSiakV2Data;
exports.fetchSiakV2Bulk = fetchSiakV2Bulk;
