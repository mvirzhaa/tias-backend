const db = require("../../config");
const SiakV2Class = require("../../models/lms/SiakV2Class");
const LmsSection = require("../../models/lms/LmsSection");
const LmsContentItem = require("../../models/lms/LmsContentItem");
const LmsContentDuplicationLog = require("../../models/lms/LmsContentDuplicationLog");

/**
 * Duplikasi materi antar kelas paralel mata kuliah yang sama (permintaan Pak Fitrah:
 * satu mata kuliah bisa punya beberapa kelas dengan dosen berbeda-beda; kelas yang masih
 * kosong bisa menarik materi dari kelas yang sudah ada isinya, tanpa membebani server).
 *
 * Arah PULL: dipicu dosen kelas KOSONG (tujuan) yang menarik dari kelas lain (sumber) —
 * dosen kelas sumber tidak terlibat/approve apa pun, materi mata kuliah yang sama memang
 * terbuka untuk ditarik oleh kelas paralelnya.
 *
 * Aturan:
 *   - type 'attendance' SELALU dikecualikan, dipaksa di server (bukan cuma andalan FE
 *     tidak mengirim id-nya) — presensi tidak boleh diduplikasi.
 *   - File (pdf/ppt) TIDAK disalin fisik — payload (storage_key/preview_storage_key)
 *     dicopy apa adanya, menunjuk ke file yang SAMA. Lihat isStorageKeyInUse() di bawah,
 *     dipakai controllers/lms/fileController.js#replaceUploadItem sebelum hapus file
 *     lama, supaya file yang masih dipakai hasil duplikasi di kelas lain tidak rusak.
 *   - Hasil duplikasi SELALU is_published=false — dosen tujuan wajib review & publish
 *     manual. Judul/nomor pertemuan disamakan dari sumber, tapi tetap bebas diedit lagi
 *     lewat endpoint update section/item biasa.
 *   - Boleh lintas periode akademik (tidak dibatasi semester yang sama).
 *   - Tiap eksekusi tercatat 1 baris di lms_content_duplication_logs (immutable).
 */

const EXCLUDED_TYPES = ["attendance"];

// Dipakai fileController#replaceUploadItem sebelum storage.remove() — cegah file yang
// masih dipakai item LAIN (hasil duplikasi berbagi storage_key/preview_storage_key yang
// sama) ikut terhapus fisik dari disk.
async function isStorageKeyInUse(key, { excludeItemId } = {}) {
  if (!key) return false;
  const [rows] = await db.query(
    `SELECT 1 FROM lms_content_items
     WHERE (payload->>'storage_key' = :key OR payload->>'preview_storage_key' = :key)
       AND id != :excludeItemId
     LIMIT 1`,
    { replacements: { key, excludeItemId: excludeItemId || null } }
  );
  return rows.length > 0;
}

async function getClassMataKuliah(kelasKuliahId) {
  return SiakV2Class.findByPk(kelasKuliahId, {
    attributes: ["kelasKuliahId", "siakMataKuliahId", "nama", "kode_matakuliah", "nama_matakuliah"],
  });
}

// Validasi kelas sumber & tujuan: harus beda kelas, harus mata kuliah SAMA. Dipakai baik
// sebelum menampilkan isi kelas sumber (read) maupun sebelum eksekusi duplikasi (write).
async function assertSameMataKuliah(targetKelasKuliahId, sourceKelasKuliahId) {
  if (String(targetKelasKuliahId) === String(sourceKelasKuliahId)) {
    throw Object.assign(new Error("Kelas sumber dan tujuan tidak boleh sama."), { status: 400 });
  }
  const [target, source] = await Promise.all([
    getClassMataKuliah(targetKelasKuliahId),
    getClassMataKuliah(sourceKelasKuliahId),
  ]);
  if (!target) throw Object.assign(new Error("Kelas tujuan tidak ditemukan."), { status: 404 });
  if (!source) throw Object.assign(new Error("Kelas sumber tidak ditemukan."), { status: 404 });
  if (!target.siakMataKuliahId || target.siakMataKuliahId !== source.siakMataKuliahId) {
    throw Object.assign(
      new Error("Mata kuliah kelas sumber tidak sama dengan kelas tujuan."),
      { status: 403 }
    );
  }
  return { target, source };
}

/**
 * selections: [{ source_section_id, item_ids? }]
 *   item_ids diabaikan/omitted → bulk (semua item non-attendance di topik itu).
 *   item_ids diisi             → granular (hanya id yang disebut, tetap difilter
 *                                 non-attendance walau eksplisit disebut klien).
 */
async function duplicateSelection({ actorUserId, targetKelasKuliahId, sourceKelasKuliahId, selections }) {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw Object.assign(new Error("Pilih minimal 1 topik/aktivitas untuk diduplikasi."), { status: 400 });
  }

  await assertSameMataKuliah(targetKelasKuliahId, sourceKelasKuliahId);

  return db.transaction(async (t) => {
    let nextSectionPosition = await LmsSection.max("position", {
      where: { kelasKuliahId: targetKelasKuliahId },
      transaction: t,
    });
    nextSectionPosition = nextSectionPosition != null ? nextSectionPosition + 1 : 0;

    const createdSections = [];
    const createdItems = [];
    const detail = [];
    let skippedAttendanceCount = 0;

    for (const sel of selections) {
      const sourceSectionId = sel && sel.source_section_id;
      if (!sourceSectionId) continue;

      const sourceSection = await LmsSection.findOne({
        where: { id: sourceSectionId, kelasKuliahId: sourceKelasKuliahId },
        transaction: t,
      });
      if (!sourceSection) {
        throw Object.assign(
          new Error(`Topik ${sourceSectionId} tidak ditemukan di kelas sumber.`),
          { status: 400 }
        );
      }

      const sourceItems = await LmsContentItem.findAll({
        where: { section_id: sourceSection.id },
        order: [["position", "ASC"]],
        transaction: t,
      });

      // Granular: validasi id yang diminta benar-benar ada di topik ini (bukan
      // di-skip diam-diam — biar kelihatan kalau ada bug di sisi pemanggil).
      const requestedIds = Array.isArray(sel.item_ids) ? sel.item_ids.map(String) : null;
      if (requestedIds) {
        const validIds = new Set(sourceItems.map((i) => String(i.id)));
        const unknown = requestedIds.filter((id) => !validIds.has(id));
        if (unknown.length) {
          throw Object.assign(
            new Error(`Item ${unknown.join(", ")} tidak ditemukan di topik ${sourceSectionId}.`),
            { status: 400 }
          );
        }
      }

      const now = new Date();
      const newSection = await LmsSection.create(
        {
          kelasKuliahId: targetKelasKuliahId,
          pertemuan: sourceSection.pertemuan,
          id_lecture: actorUserId,
          title: sourceSection.title,
          description: sourceSection.description,
          position: nextSectionPosition,
          is_published: false,
          available_from: null,
          duplicated_from_section_id: sourceSection.id,
          created_at: now,
          updated_at: now,
        },
        { transaction: t }
      );
      nextSectionPosition += 1;
      createdSections.push(newSection);

      const itemsCopied = [];
      const itemsSkippedAttendance = [];

      for (const item of sourceItems) {
        if (EXCLUDED_TYPES.includes(item.type)) {
          itemsSkippedAttendance.push(item.id);
          skippedAttendanceCount += 1;
          continue;
        }
        if (requestedIds && !requestedIds.includes(String(item.id))) continue;

        const newItem = await LmsContentItem.create(
          {
            section_id: newSection.id,
            type: item.type,
            title: item.title,
            description: item.description,
            position: item.position,
            is_published: false,
            // Dicopy apa adanya — utk pdf/ppt ini menunjuk storage_key/preview_storage_key
            // yang SAMA dgn item asal, TIDAK ada file baru ditulis ke disk.
            payload: item.payload,
            duplicated_from_item_id: item.id,
            created_at: now,
            updated_at: now,
          },
          { transaction: t }
        );
        createdItems.push(newItem);
        itemsCopied.push(newItem.id);
      }

      detail.push({
        source_section_id: sourceSection.id,
        target_section_id: newSection.id,
        items_copied: itemsCopied,
        items_skipped_attendance: itemsSkippedAttendance,
      });
    }

    await LmsContentDuplicationLog.create(
      {
        actor_user_id: actorUserId,
        source_kelas_kuliah_id: sourceKelasKuliahId,
        target_kelas_kuliah_id: targetKelasKuliahId,
        sections_created: createdSections.length,
        items_created: createdItems.length,
        skipped_attendance_count: skippedAttendanceCount,
        detail,
        created_at: new Date(),
      },
      { transaction: t }
    );

    return {
      sections_created: createdSections.length,
      items_created: createdItems.length,
      skipped_attendance_count: skippedAttendanceCount,
      sections: createdSections,
      items: createdItems,
    };
  });
}

module.exports = {
  EXCLUDED_TYPES,
  isStorageKeyInUse,
  assertSameMataKuliah,
  duplicateSelection,
};
