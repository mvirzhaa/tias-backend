const { Op } = require("sequelize");
const db = require("../../../config");
const SiakV2Class = require("../../../models/lms/SiakV2Class");
const SiakV2ClassLecturer = require("../../../models/lms/SiakV2ClassLecturer");
const SiakV2Participant = require("../../../models/lms/SiakV2Participant");
const SiakV2ProgramStudi = require("../../../models/lms/SiakV2ProgramStudi");
const SiakV2Jadwal = require("../../../models/lms/SiakV2Jadwal");
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

  const prodiMap = new Map(); // siakProgramStudiId → programStudi (adapter)
  let classesUpserted = 0;
  let lecturersTotal = 0;
  let jadwalTotal = 0;
  let participantsTotal = 0;
  const classFailures = [];

  // Loop kelas (paginated) dari /api/public. Jadwal & peserta sudah nested → tak ada fan-out.
  let page = 1;
  for (;;) {
    const { rows, hasNext } = await adapter.listKelas(client, { page, size });

    for (const k of rows) {
      if (k.programStudi && k.programStudi.siakProgramStudiId) {
        prodiMap.set(k.programStudi.siakProgramStudiId, k.programStudi);
      }

      // Upsert kelas + rekonsiliasi lecturers/jadwal/peserta — txn per-kelas.
      // is_active murni dari statusKelas sumber (Aktif→true, lainnya→false); TIDAK ada
      // deaktivasi by seen-set agar run gagal-di-tengah tak menonaktifkan kelas sah massal.
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
                nama: l.nama,
                created_at: now,
                updated_at: now,
              })),
              { transaction }
            );
            lecturersTotal += k.lecturers.length;
          }

          // Jadwal: rekonsiliasi set per-kelas (delete + reinsert distinct slot).
          await SiakV2Jadwal.destroy({
            where: { kelasKuliahId: k.kelasKuliahId },
            transaction,
          });
          if (k.jadwal.length) {
            await SiakV2Jadwal.bulkCreate(
              k.jadwal.map((j) => ({
                id: j.siak_jadwal_id,
                kelasKuliahId: k.kelasKuliahId,
                hari: j.hari,
                jam_mulai: j.jam_mulai,
                jam_selesai: j.jam_selesai,
                jenis_pertemuan: j.jenis_pertemuan,
                metode_pembelajaran: j.metode_pembelajaran,
                siak_dosen_id: j.siak_dosen_id,
                siak_ruangan_id: j.siak_ruangan_id,
                ruangan_nama: j.ruangan_nama,
                ruangan_kode: j.ruangan_kode,
                lantai: j.lantai,
                ruangan_kapasitas: j.ruangan_kapasitas,
                created_at: now,
                updated_at: now,
              })),
              { transaction }
            );
            jadwalTotal += k.jadwal.length;
          }

          // Peserta: dari payload nested (rincianKrsMahasiswa). Rekonsiliasi set per-kelas.
          await SiakV2Participant.destroy({
            where: { kelasKuliahId: k.kelasKuliahId },
            transaction,
          });
          if (k.peserta.length) {
            await SiakV2Participant.bulkCreate(
              k.peserta.map((p) => ({
                kelasKuliahId: k.kelasKuliahId,
                siak_mahasiswa_id: p.siak_mahasiswa_id,
                npm: p.npm,
                nama: p.nama,
                created_at: now,
                updated_at: now,
              })),
              { transaction }
            );
            participantsTotal += k.peserta.length;
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

    // CATATAN: /api/public memberi pagination TIDAK akurat (totalItems/totalPage jauh
    // lebih besar dari data riil → klaim 3092/62 padahal data habis di ~110). Andalkan
    // jumlah baris: halaman lebih pendek dari `size` (atau kosong) = halaman terakhir.
    if (rows.length < size || !hasNext) break;
    page += 1;
  }

  // Upsert dimensi prodi (fakultas null — degradasi prodi-only bila master absen).
  const prodiRows = Array.from(prodiMap.values());
  if (prodiRows.length) {
    const now = new Date();
    await SiakV2ProgramStudi.bulkCreate(
      prodiRows.map((pr) => ({
        siakProgramStudiId: pr.siakProgramStudiId,
        siakFakultasId: pr.siakFakultasId,
        kode_prodi: pr.kode_prodi,
        nama_prodi: pr.nama_prodi,
        nama_fakultas: pr.nama_fakultas,
        jenjang: pr.jenjang,
        is_active: true,
        created_at: now,
        updated_at: now,
      })),
      {
        // programStudi.fakultas kini ada di payload → kita jadi sumber field ini.
        updateOnDuplicate: [
          "siakFakultasId",
          "kode_prodi",
          "nama_prodi",
          "nama_fakultas",
          "jenjang",
          "is_active",
          "updated_at",
        ],
      }
    );
  }

  // Linking siak_user_mappings (idempoten).
  const linking = {
    dosen: await linkDosen(),
    mahasiswa: await linkMahasiswa(),
  };

  // Reconciliation report (WAJIB).
  return {
    classes: { upserted: classesUpserted },
    program_studi: { upserted: prodiRows.length },
    lecturers: { rows: lecturersTotal },
    jadwal: { rows: jadwalTotal },
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
