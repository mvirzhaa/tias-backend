const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const db = require("../../config");
const { response } = require("../../lib/response");
const LmsSection = require("../../models/lms/LmsSection");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const LmsSubmission = require("../../models/lms/LmsSubmission");

/**
 * SPEC v6 §4 — Sections CRUD + reorder (CABANG MATI).
 * Tulis dilindungi `lecturerOwnsClass` (req.lmsLecturerId & req.lmsSection sudah diisi
 * middleware). Identitas dosen TIDAK pernah diambil dari req.body.
 */

const pick = (req, key) =>
  req.query[key] != null ? req.query[key] : req.body[key];

// Info kelas dari siak_v2_classes (+ join prodi), kolom/join konsisten dengan
// listLmsClasses (siakStagingBridgeService). Dipakai listSections & getSection agar FE
// bisa menampilkan identitas matkul (mis. judul halaman modul) tanpa fetch terpisah.
// Catatan: kolom `semester` sudah di-drop dari siak_v2_classes (brief v2) — hanya
// siakPeriodeAkademikId (UUID) yang tersedia, jadi `semester` return null sampai ada
// sumber periode akademik yang bisa di-resolve.
async function getClassInfo(kelasKuliahId) {
  const [classRows] = await db.query(
    `SELECT
       cls."kelasKuliahId",
       cls.nama_matakuliah,
       cls.kode_matakuliah,
       cls.nama AS nama_kelas,
       cls."siakPeriodeAkademikId",
       ps.nama_prodi
     FROM siak_v2_classes cls
     LEFT JOIN siak_v2_program_studi ps ON ps."siakProgramStudiId" = cls."siakProgramStudiId"
     WHERE cls."kelasKuliahId" = :kelasKuliahId
     LIMIT 1`,
    { replacements: { kelasKuliahId } }
  );

  const row = classRows[0];
  return row
    ? {
        kelasKuliahId: row.kelasKuliahId,
        nama_matakuliah: row.nama_matakuliah,
        kode_matakuliah: row.kode_matakuliah,
        nama_kelas: row.nama_kelas,
        semester: null, // kolom di-drop dari siak_v2_classes; lihat catatan di atas
        siakPeriodeAkademikId: row.siakPeriodeAkademikId,
        nama_prodi: row.nama_prodi,
      }
    : null;
}

// GET /lms/sections?kelasKuliahId=
// Respons: { class: {...info kelas...}, sections: [...] }. `sections` tetap berisi
// data yang sama seperti sebelumnya (array topik + content_items). `class` ditambahkan
// agar FE bisa menampilkan identitas matkul (mis. judul halaman) tanpa fetch terpisah.
exports.listSections = asyncHandler(async (req, res) => {
  const { kelasKuliahId } = req.query;

  if (!kelasKuliahId) {
    return response(res, false, "kelasKuliahId wajib diisi.", null, 400);
  }

  const sections = await LmsSection.findAll({
    where: { kelasKuliahId },
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

  const classInfo = await getClassInfo(kelasKuliahId);

  return response(res, true, "Success", { class: classInfo, sections });
});

// GET /lms/sections/:id  (middleware sudah memuat req.lmsSection)
// Respons: { class: {...info kelas...}, ...section }. `class` ditambahkan (konsisten
// dengan listSections) agar FE bisa menampilkan nama matkul di judul halaman modul,
// tanpa perlu fetch /lms/sections?kelasKuliahId= terpisah.
exports.getSection = asyncHandler(async (req, res) => {
  const section = await LmsSection.findByPk(req.params.id, {
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

  if (!section) {
    return response(res, false, "Section tidak ditemukan.", null, 404);
  }

  const classInfo = await getClassInfo(section.kelasKuliahId);

  return response(res, true, "Success", { class: classInfo, ...section.toJSON() });
});

// POST /lms/sections?kelasKuliahId=&pertemuan=
exports.createSection = asyncHandler(async (req, res) => {
  const kelasKuliahId = pick(req, "kelasKuliahId");
  const pertemuan = pick(req, "pertemuan");
  const { title, description, position, is_published, available_from } = req.body;

  if (!kelasKuliahId || pertemuan == null) {
    return response(
      res,
      false,
      "kelasKuliahId, pertemuan wajib diisi.",
      null,
      400
    );
  }
  if (!title || String(title).trim() === "") {
    return response(res, false, "title wajib diisi.", null, 400);
  }

  // Default posisi = urutan berikutnya (paling bawah), bukan 0 — 0 selalu menaruh
  // section baru di ATAS section yang sudah ada (diurutkan ASC by position).
  let nextPosition = 0;
  if (position != null) {
    nextPosition = parseInt(position, 10);
  } else {
    const maxPosition = await LmsSection.max("position", {
      where: { kelasKuliahId: String(kelasKuliahId) },
    });
    nextPosition = maxPosition != null ? maxPosition + 1 : 0;
  }

  const now = new Date();
  const section = await LmsSection.create({
    kelasKuliahId: String(kelasKuliahId),
    pertemuan: parseInt(pertemuan, 10),
    id_lecture: req.lmsLecturerId, // = user_id dosen, dari JWT via middleware
    title,
    description: description ?? null,
    position: nextPosition,
    is_published: is_published === true || is_published === "true",
    available_from: available_from ?? null,
    created_at: now,
    updated_at: now,
  });

  return response(res, true, "Section berhasil dibuat.", section, 201);
});

// PUT /lms/sections/:id  (middleware sudah memverifikasi kepemilikan & memuat req.lmsSection)
exports.updateSection = asyncHandler(async (req, res) => {
  const section = req.lmsSection;
  const { title, description, position, is_published, available_from, pertemuan } =
    req.body;

  // Hanya field konten yang boleh diubah. Identitas kelas (kelasKuliahId/semester)
  // & kepemilikan (id_lecture) TIDAK diubah lewat endpoint ini.
  const updates = { updated_at: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (position !== undefined) updates.position = parseInt(position, 10);
  if (is_published !== undefined)
    updates.is_published = is_published === true || is_published === "true";
  if (available_from !== undefined) updates.available_from = available_from;
  if (pertemuan !== undefined) updates.pertemuan = parseInt(pertemuan, 10);

  await section.update(updates);

  return response(res, true, "Section berhasil diperbarui.", section);
});

// DELETE /lms/sections/:id  (soft delete, konvensi repo)
exports.deleteSection = asyncHandler(async (req, res) => {
  const section = req.lmsSection;

  const now = new Date();
  await section.update({ deleted_at: now });

  // Submission anak (assignment di section ini) ikut soft-delete — ambil id item dulu
  // sebelum item ditandai terhapus (defaultScope menyaring deleted_at IS NULL).
  const items = await LmsContentItem.findAll({
    where: { section_id: section.id, deleted_at: null },
    attributes: ["id"],
  });
  const itemIds = items.map((i) => i.id);

  // Ikut soft-delete konten anak agar tidak yatim.
  await LmsContentItem.update(
    { deleted_at: now },
    { where: { section_id: section.id, deleted_at: null } }
  );

  if (itemIds.length) {
    await LmsSubmission.update(
      { deleted_at: now, updated_at: now },
      { where: { content_item_id: { [Op.in]: itemIds }, deleted_at: null } }
    );
  }

  return response(res, true, "Section berhasil dihapus.", null);
});

// PATCH /lms/sections/reorder  body: { kelasKuliahId, items:[{id,position}] }
exports.reorderSections = asyncHandler(async (req, res) => {
  const kelasKuliahId = pick(req, "kelasKuliahId");
  const { items } = req.body;

  if (!kelasKuliahId) {
    return response(res, false, "kelasKuliahId wajib diisi.", null, 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    return response(res, false, "items[] wajib diisi.", null, 400);
  }

  // Scoping ke kelas yang sudah diverifikasi middleware → id section milik kelas lain diabaikan.
  await db.transaction(async (t) => {
    for (const it of items) {
      if (!it || it.id == null || it.position == null) continue;
      await LmsSection.update(
        { position: parseInt(it.position, 10), updated_at: new Date() },
        {
          where: { id: it.id, kelasKuliahId },
          transaction: t,
        }
      );
    }
  });

  return response(res, true, "Urutan section diperbarui.", null);
});
