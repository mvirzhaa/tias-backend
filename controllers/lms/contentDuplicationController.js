const asyncHandler = require("express-async-handler");
const db = require("../../config");
const { response } = require("../../lib/response");
const SiakV2Class = require("../../models/lms/SiakV2Class");
const LmsSection = require("../../models/lms/LmsSection");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const {
  assertSameMataKuliah,
  duplicateSelection,
  EXCLUDED_TYPES,
} = require("../../lib/lms/contentDuplication");

/**
 * "Duplikat dari Kelas Lain" (permintaan Pak Fitrah) — lihat lib/lms/contentDuplication.js
 * untuk aturan lengkap. req.duplicationTargetKelasKuliahId & req.lmsLecturerId sudah
 * diisi middleware/lms/duplicationAccess.js#lecturerOwnsTargetForDuplication.
 */

// GET /lms/duplication/sources?targetKelasKuliahId=
// Kelas LAIN dengan mata kuliah SAMA dgn kelas tujuan — kandidat sumber duplikasi,
// lintas periode akademik (tidak dibatasi semester yang sama).
exports.listDuplicationSources = asyncHandler(async (req, res) => {
  const targetKelasKuliahId = req.duplicationTargetKelasKuliahId;

  const target = await SiakV2Class.findByPk(targetKelasKuliahId, {
    attributes: ["kelasKuliahId", "siakMataKuliahId"],
  });
  if (!target) {
    return response(res, false, "Kelas tujuan tidak ditemukan.", null, 404);
  }
  if (!target.siakMataKuliahId) {
    return response(res, true, "Success", []);
  }

  const [rows] = await db.query(
    `SELECT
       cls."kelasKuliahId",
       cls.nama AS nama_kelas,
       cls.kode_matakuliah,
       cls.nama_matakuliah,
       cls.nama_periode,
       (SELECT COUNT(*) FROM lms_sections s
          WHERE s."kelasKuliahId" = cls."kelasKuliahId" AND s.deleted_at IS NULL) AS jumlah_topik
     FROM siak_v2_classes cls
     WHERE cls."siakMataKuliahId" = :siakMataKuliahId
       AND cls."kelasKuliahId" != :targetKelasKuliahId
     ORDER BY cls.nama_periode DESC NULLS LAST, cls.nama ASC`,
    { replacements: { siakMataKuliahId: target.siakMataKuliahId, targetKelasKuliahId } }
  );

  return response(res, true, "Success", rows);
});

// GET /lms/duplication/source-content?targetKelasKuliahId=&sourceKelasKuliahId=
// Isi (sections+items) kelas sumber, READ-ONLY, utk picker FE. `duplicable:false`
// khusus type attendance — FE tinggal disable checkbox-nya, tidak perlu hardcode tipe.
exports.getDuplicationSourceContent = asyncHandler(async (req, res) => {
  const targetKelasKuliahId = req.duplicationTargetKelasKuliahId;
  const sourceKelasKuliahId = req.query.sourceKelasKuliahId;
  if (!sourceKelasKuliahId || String(sourceKelasKuliahId).trim() === "") {
    return response(res, false, "Parameter sourceKelasKuliahId wajib diisi.", null, 400);
  }

  try {
    await assertSameMataKuliah(targetKelasKuliahId, sourceKelasKuliahId);
  } catch (error) {
    return response(res, false, error.message, null, error.status || 400);
  }

  const sections = await LmsSection.findAll({
    where: { kelasKuliahId: sourceKelasKuliahId },
    order: [
      ["position", "ASC"],
      ["pertemuan", "ASC"],
    ],
    include: [
      {
        model: LmsContentItem,
        as: "content_items",
        required: false,
        separate: true,
        order: [["position", "ASC"]],
      },
    ],
  });

  const result = sections.map((section) => ({
    ...section.toJSON(),
    content_items: section.content_items.map((item) => ({
      ...item.toJSON(),
      duplicable: !EXCLUDED_TYPES.includes(item.type),
    })),
  }));

  return response(res, true, "Success", result);
});

// POST /lms/duplication/execute
// body: { targetKelasKuliahId, sourceKelasKuliahId, selections: [{ source_section_id, item_ids? }] }
exports.executeDuplication = asyncHandler(async (req, res) => {
  const targetKelasKuliahId = req.duplicationTargetKelasKuliahId;
  const { sourceKelasKuliahId, selections } = req.body;
  if (!sourceKelasKuliahId || String(sourceKelasKuliahId).trim() === "") {
    return response(res, false, "Parameter sourceKelasKuliahId wajib diisi.", null, 400);
  }

  try {
    const result = await duplicateSelection({
      actorUserId: req.lmsLecturerId,
      targetKelasKuliahId,
      sourceKelasKuliahId,
      selections,
    });
    return response(res, true, "Materi berhasil diduplikasi.", result, 201);
  } catch (error) {
    return response(res, false, error.message, null, error.status || 400);
  }
});

// GET /lms/duplication/logs?kelasKuliahId=
// Admin: semua log (opsional filter kelasKuliahId). Dosen/Dosen_Ext: hanya log yang
// melibatkan kelas yg dia ampu, baik sbg SUMBER maupun TUJUAN.
exports.listDuplicationLogs = asyncHandler(async (req, res) => {
  const { kelasKuliahId } = req.query;
  const conditions = [];
  const replacements = {};

  if (req.user && req.user.role === "Admin") {
    if (kelasKuliahId) {
      conditions.push(`(l.source_kelas_kuliah_id = :kelasKuliahId OR l.target_kelas_kuliah_id = :kelasKuliahId)`);
      replacements.kelasKuliahId = kelasKuliahId;
    }
  } else if (req.user && (req.user.role === "Dosen" || req.user.role === "Dosen_Ext")) {
    const siakUserUuid = req.user.siakUserUuid;
    if (!siakUserUuid) {
      return response(res, true, "Success", []);
    }
    conditions.push(`(
      l.source_kelas_kuliah_id IN (SELECT "kelasKuliahId" FROM siak_v2_class_lecturers WHERE siak_dosen_id = :siakUserUuid)
      OR l.target_kelas_kuliah_id IN (SELECT "kelasKuliahId" FROM siak_v2_class_lecturers WHERE siak_dosen_id = :siakUserUuid)
    )`);
    replacements.siakUserUuid = siakUserUuid;
    if (kelasKuliahId) {
      conditions.push(`(l.source_kelas_kuliah_id = :kelasKuliahId OR l.target_kelas_kuliah_id = :kelasKuliahId)`);
      replacements.kelasKuliahId = kelasKuliahId;
    }
  } else {
    return response(res, false, "Akses ditolak.", null, 403);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.query(
    `SELECT
       l.id, l.created_at, l.sections_created, l.items_created, l.skipped_attendance_count, l.detail,
       l.actor_user_id, u.email AS actor_email, u.nidn AS actor_nidn,
       l.source_kelas_kuliah_id, sc.nama AS source_nama_kelas, sc.nama_matakuliah AS source_nama_matakuliah,
       l.target_kelas_kuliah_id, tc.nama AS target_nama_kelas, tc.nama_matakuliah AS target_nama_matakuliah
     FROM lms_content_duplication_logs l
     LEFT JOIN tb_users u ON u.user_id = l.actor_user_id
     LEFT JOIN siak_v2_classes sc ON sc."kelasKuliahId" = l.source_kelas_kuliah_id
     LEFT JOIN siak_v2_classes tc ON tc."kelasKuliahId" = l.target_kelas_kuliah_id
     ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT 200`,
    { replacements }
  );

  return response(res, true, "Success", rows);
});
