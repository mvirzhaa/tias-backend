const { Op } = require("sequelize");
const db = require("../../../config");
const SiakV2Class = require("../../../models/lms/SiakV2Class");
const SiakV2ClassLecturer = require("../../../models/lms/SiakV2ClassLecturer");
const SiakV2Participant = require("../../../models/lms/SiakV2Participant");
const SiakV2ProgramStudi = require("../../../models/lms/SiakV2ProgramStudi");
const SiakUserMapping = require("../../../models/lms/SiakUserMapping");
const { createClient } = require("./client");
const adapter = require("./adapter");

/**
 * Sync SIAK v2 — pull-direct ke siak_v2_* + linking siak_user_mappings (BRIEF v2 Task 3).
 *
 * Idempoten, upsert-only. GUARDRAIL:
 *   - Tidak ada hard delete kelas (FK lms_sections RESTRICT terlindungi) → soft-deactivate.
 *   - Join table (lecturers/participants) = proyeksi murni → rekonsiliasi set per-kelas.
 *   - Tidak menyentuh m_matakuliah, m_kurikulum, absensi_mhs, pembelajaran_dosen_ext, lms_*.
 *   - Linking hormati uq_sum_* + verified/rejected (lihat linkIdentities).
 */

const DEFAULT_PAGE_SIZE = parseInt(process.env.SIAK_V2_PAGE_SIZE || "100", 10);

const isAktif = (status) => String(status || "").toLowerCase() === "aktif";

async function syncSiakV2(options = {}) {
  const client = createClient();
  const size = parseInt(options.pageSize, 10) || DEFAULT_PAGE_SIZE;

  // 1. Periode aktif.
  const periode = await adapter.getActivePeriode(client);
  if (!periode || !periode.id) {
    throw new Error("Periode akademik aktif tidak ditemukan dari SIAK.");
  }

  const seenClassIds = [];
  const prodiMap = new Map(); // siakProgramStudiId → { nama_prodi, jenjang }
  let classesUpserted = 0;
  let lecturersTotal = 0;
  let participantsTotal = 0;
  const classFailures = [];

  // 2. Loop kelas (paginated).
  let page = 1;
  for (;;) {
    const { rows, hasNext } = await adapter.listKelasKuliah(client, {
      periodeId: periode.id,
      page,
      size,
    });

    for (const k of rows) {
      seenClassIds.push(k.kelasKuliahId);
      if (k.programStudi && k.programStudi.siakProgramStudiId) {
        prodiMap.set(k.programStudi.siakProgramStudiId, k.programStudi);
      }

      // 2a. FETCH peserta DULU. Jika gagal → JANGAN delete roster existing (cegah kosong).
      let peserta = null;
      try {
        peserta = await adapter.listPeserta(client, k.kelasKuliahId);
      } catch (error) {
        classFailures.push({
          kelasKuliahId: k.kelasKuliahId,
          stage: "peserta_fetch",
          error: error.message,
        });
      }

      // 2b. Upsert kelas + rekonsiliasi lecturers + (peserta bila fetch sukses) — txn per-kelas.
      try {
        await db.transaction(async (transaction) => {
          const now = new Date();

          await SiakV2Class.bulkCreate(
            [
              {
                kelasKuliahId: k.kelasKuliahId,
                siakProgramStudiId: k.siakProgramStudiId,
                siakPeriodeAkademikId: k.siakPeriodeAkademikId,
                siakMataKuliahId: k.siakMataKuliahId,
                nama: k.nama,
                kode_matakuliah: k.kode_matakuliah,
                nama_matakuliah: k.nama_matakuliah,
                status_kelas: k.status_kelas,
                kapasitas: k.kapasitas,
                is_active: isAktif(k.status_kelas),
                created_at: now,
                updated_at: now,
              },
            ],
            {
              transaction,
              updateOnDuplicate: [
                "siakProgramStudiId",
                "siakPeriodeAkademikId",
                "siakMataKuliahId",
                "nama",
                "kode_matakuliah",
                "nama_matakuliah",
                "status_kelas",
                "kapasitas",
                "is_active",
                "updated_at",
              ],
            }
          );

          // Lecturers: rekonsiliasi set (delete kelas itu + reinsert distinct).
          await SiakV2ClassLecturer.destroy({
            where: { kelasKuliahId: k.kelasKuliahId },
            transaction,
          });
          if (k.lecturers.length) {
            await SiakV2ClassLecturer.bulkCreate(
              k.lecturers.map((l) => ({
                kelasKuliahId: k.kelasKuliahId,
                siak_dosen_id: l.siak_dosen_id,
                nidn: l.nidn,
                created_at: now,
                updated_at: now,
              })),
              { transaction }
            );
            lecturersTotal += k.lecturers.length;
          }

          // Peserta: delete+reinsert HANYA bila fetch sukses (pengganti sudah di tangan).
          if (peserta !== null) {
            await SiakV2Participant.destroy({
              where: { kelasKuliahId: k.kelasKuliahId },
              transaction,
            });
            if (peserta.length) {
              await SiakV2Participant.bulkCreate(
                peserta.map((p) => ({
                  kelasKuliahId: k.kelasKuliahId,
                  siak_mahasiswa_id: p.siak_mahasiswa_id,
                  npm: p.npm,
                  created_at: now,
                  updated_at: now,
                })),
                { transaction }
              );
              participantsTotal += peserta.length;
            }
          }
        });
        classesUpserted += 1;
      } catch (error) {
        classFailures.push({
          kelasKuliahId: k.kelasKuliahId,
          stage: "upsert",
          error: error.message,
        });
      }
    }

    if (!hasNext) break;
    page += 1;
  }

  // 3. Upsert dimensi prodi (fakultas null — degradasi prodi-only bila master absen).
  const prodiRows = Array.from(prodiMap.values());
  if (prodiRows.length) {
    const now = new Date();
    await SiakV2ProgramStudi.bulkCreate(
      prodiRows.map((pr) => ({
        siakProgramStudiId: pr.siakProgramStudiId,
        siakFakultasId: null,
        kode_prodi: null,
        nama_prodi: pr.nama_prodi,
        jenjang: pr.jenjang,
        is_active: true,
        created_at: now,
        updated_at: now,
      })),
      {
        // Jangan timpa siakFakultasId/kode_prodi — biar master sync (nanti) bisa mengisi.
        updateOnDuplicate: ["nama_prodi", "jenjang", "is_active", "updated_at"],
      }
    );
  }

  // 4. Soft-deactivate kelas periode aktif yang tak terlihat di run ini.
  //    Seen-set DIBATASI periode aktif → periode lain tidak disentuh.
  let deactivated = 0;
  if (seenClassIds.length) {
    const [affected] = await SiakV2Class.update(
      { is_active: false, updated_at: new Date() },
      {
        where: {
          siakPeriodeAkademikId: periode.id,
          is_active: true,
          kelasKuliahId: { [Op.notIn]: seenClassIds },
        },
      }
    );
    deactivated = affected;
  }

  // 5. Linking siak_user_mappings (idempoten).
  const linking = {
    dosen: await linkDosen(),
    mahasiswa: await linkMahasiswa(),
  };

  // 6. Reconciliation report (WAJIB).
  return {
    periode: { id: periode.id, kode: periode.kode, nama: periode.nama },
    classes: { upserted: classesUpserted, deactivated },
    program_studi: { upserted: prodiRows.length },
    lecturers: { rows: lecturersTotal },
    participants: { rows: participantsTotal, class_failures: classFailures },
    linking,
    synced_at: new Date(),
  };
}

// ---- Linking ----

async function linkDosen() {
  const [rows] = await db.query(`
    SELECT DISTINCT siak_dosen_id, btrim(nidn) AS identifier
    FROM siak_v2_class_lecturers
    WHERE siak_dosen_id IS NOT NULL
      AND NULLIF(btrim(nidn), '') IS NOT NULL
  `);
  return linkIdentities(rows, {
    siakField: "siak_dosen_id",
    identifierType: "nidn",
    userColumn: "nidn",
  });
}

async function linkMahasiswa() {
  const [rows] = await db.query(`
    SELECT DISTINCT siak_mahasiswa_id, btrim(npm) AS identifier
    FROM siak_v2_participants
    WHERE siak_mahasiswa_id IS NOT NULL
      AND NULLIF(btrim(npm), '') IS NOT NULL
  `);
  return linkIdentities(rows, {
    siakField: "siak_mahasiswa_id",
    identifierType: "npm",
    userColumn: "npm",
  });
}

/**
 * Cocokkan identifier (NIDN/NPM, ter-normalisasi btrim) ke tb_users, upsert mapping 'auto'.
 *   - 0 match  → unmatched
 *   - >1 match → conflict
 *   - existing verified/rejected pasangan beda → conflict (jangan turunkan/hidupkan)
 *   - existing auto pasangan beda → conflict (hormati uq_sum_*, bukan overwrite)
 *   - pasangan sama → refresh; belum ada → insert 'auto'
 */
async function linkIdentities(rows, { siakField, identifierType, userColumn }) {
  const unmatched = [];
  const conflict = [];
  let matched = 0;

  for (const row of rows) {
    const siakUuid = row[siakField];
    const identifier = row.identifier;

    const [users] = await db.query(
      `SELECT user_id FROM tb_users
       WHERE deleted_at IS NULL AND btrim(${userColumn}) = btrim(:identifier)`,
      { replacements: { identifier } }
    );

    if (users.length === 0) {
      unmatched.push({ [siakField]: siakUuid, [identifierType]: identifier });
      continue;
    }
    if (users.length > 1) {
      conflict.push({ [identifierType]: identifier, reason: "multiple_ucl_users", candidates: users.length });
      continue;
    }

    const tiasUserId = users[0].user_id;
    const existing = await SiakUserMapping.findOne({
      where: { [Op.or]: [{ tias_user_id: tiasUserId }, { siak_user_uuid: siakUuid }] },
    });

    if (existing) {
      const samePair =
        existing.tias_user_id === tiasUserId && existing.siak_user_uuid === siakUuid;

      if (existing.status === "verified" || existing.status === "rejected") {
        if (!samePair) {
          conflict.push({ [identifierType]: identifier, reason: `conflict_with_${existing.status}` });
        } else {
          matched += 1; // sudah benar & terkunci — biarkan
        }
        continue;
      }

      // existing 'auto'
      if (!samePair) {
        conflict.push({ [identifierType]: identifier, reason: "conflict_existing_auto_other_pair" });
        continue;
      }

      await existing.update({
        identifier,
        identifier_type: identifierType,
        matched_via: identifierType,
        matched_at: new Date(),
        updated_at: new Date(),
      });
      matched += 1;
      continue;
    }

    await SiakUserMapping.create({
      tias_user_id: tiasUserId,
      siak_user_uuid: siakUuid,
      identifier,
      identifier_type: identifierType,
      matched_via: identifierType,
      status: "auto",
      matched_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    matched += 1;
  }

  return { matched, unmatched, conflict };
}

module.exports = { syncSiakV2, linkDosen, linkMahasiswa };
