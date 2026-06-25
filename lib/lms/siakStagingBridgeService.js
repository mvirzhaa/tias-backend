const db = require("../../config");
const { getUserRoleScopes } = require("./roleScopeService");

/**
 * Sumber daftar kelas LMS = tabel proyeksi SIAK v2 (siak_v2_*), hasil pull-direct
 * sync (BRIEF v2 Task 3). Otorisasi baca/scope memakai UUID:
 *   - dosen     : siak_v2_class_lecturers.siak_dosen_id == user.siakUserUuid
 *   - mahasiswa : siak_v2_participants.siak_mahasiswa_id == user.siakUserUuid
 *   - admin prodi    : cls."siakProgramStudiId" ∈ scope
 *   - admin fakultas : ps."siakFakultasId" ∈ scope (DEGRADASI: hanya berfungsi setelah
 *                      dimensi siakFakultasId pada siak_v2_program_studi terisi)
 * TIDAK ada lagi pembacaan staging siak_sync_* (jalur v1 mock dimatikan).
 */

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

// TODO: ambil periode aktif secara dinamis dari /api/public/periode-akademik (status='Aktif')
//       daripada hardcode. Hardcode sementara untuk scope semester berjalan.
const PERIODE_AKTIF = '0197fce6-e176-7479-a917-64e7d8063a9b'; // 2025 Ganjil

const normalizeLimit = (value) => {
  const parsed = parseInt(value || DEFAULT_LIMIT, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const normalizePage = (value) => {
  const parsed = parseInt(value || 1, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return 1;
  return parsed;
};

// Membangun klausa pembatas akses kelas sesuai identitas/scope user.
// Mengembalikan { unrestricted, conditions[], replacements{} }.
// conditions di-OR di dalam listLmsClasses; alias tabel: cls (kelas), ps (program studi).
async function buildClassAccess(user) {
  if (!user) return { unrestricted: false, conditions: [], replacements: {} };
  if (user.role === "Admin") return { unrestricted: true, conditions: [], replacements: {} };

  const conditions = [];
  const replacements = {};

  // Identitas SIAK (UUID) di-resolve saat login (authMiddleware → siak_user_mappings).
  if (
    (user.role === "Dosen" || user.role === "Dosen_Ext") &&
    user.siakUserUuid
  ) {
    conditions.push(`EXISTS (
      SELECT 1 FROM siak_v2_class_lecturers lecturer_access
      WHERE lecturer_access."kelasKuliahId" = cls."kelasKuliahId"
        AND lecturer_access.siak_dosen_id = :siakUserUuid
    )`);
    replacements.siakUserUuid = user.siakUserUuid;
  }

  if (user.role === "Mahasiswa" && user.siakUserUuid) {
    conditions.push(`EXISTS (
      SELECT 1 FROM siak_v2_participants participant_access
      WHERE participant_access."kelasKuliahId" = cls."kelasKuliahId"
        AND participant_access.siak_mahasiswa_id = :siakUserUuid
    )`);
    replacements.siakUserUuid = user.siakUserUuid;
  }

  const scopes = await getUserRoleScopes(user.user_id);
  if (scopes.some((scope) => scope.scope_type === "university")) {
    return { unrestricted: true, conditions: [], replacements: {} };
  }

  const facultyIds = scopes
    .filter((scope) => scope.scope_type === "faculty" && scope.fakultas_id)
    .map((scope) => scope.fakultas_id);
  const prodiIds = scopes
    .filter((scope) => scope.scope_type === "study_program" && scope.prodi_id)
    .map((scope) => scope.prodi_id);

  if (facultyIds.length) {
    conditions.push(`ps."siakFakultasId" IN (:facultyIds)`);
    replacements.facultyIds = facultyIds;
  }
  if (prodiIds.length) {
    conditions.push(`cls."siakProgramStudiId" IN (:prodiIds)`);
    replacements.prodiIds = prodiIds;
  }

  return { unrestricted: false, conditions, replacements };
}

async function listLmsClasses(options = {}) {
  const limit = normalizeLimit(options.limit);
  const page = normalizePage(options.page);
  const offset = (page - 1) * limit;
  const access = await buildClassAccess(options.user);

  const replacements = {
    limit,
    offset,
    search: options.search ? `%${String(options.search).trim()}%` : null,
    periodeAktif: PERIODE_AKTIF,
    ...access.replacements,
  };

  // Scope daftar kelas ke periode akademik aktif (semester berjalan).
  const where = ['cls.is_active = true', 'cls."siakPeriodeAkademikId" = :periodeAktif'];
  if (replacements.search) {
    where.push(`(
      cls.kode_matakuliah ILIKE :search OR
      cls.nama_matakuliah ILIKE :search OR
      cls.nama ILIKE :search OR
      ps.nama_prodi ILIKE :search
    )`);
  }
  if (!access.unrestricted) {
    where.push(access.conditions.length ? `(${access.conditions.join(" OR ")})` : "false");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const baseFrom = `
    FROM siak_v2_classes cls
    LEFT JOIN siak_v2_program_studi ps ON ps."siakProgramStudiId" = cls."siakProgramStudiId"
  `;

  const [countRows] = await db.query(
    `SELECT count(*)::int AS total ${baseFrom} ${whereSql}`,
    { replacements }
  );

  const [rows] = await db.query(
    `SELECT
      cls."kelasKuliahId",
      cls.nama AS nama_kelas,
      cls.kode_matakuliah,
      cls.nama_matakuliah,
      cls.status_kelas,
      cls.kapasitas,
      cls."siakProgramStudiId",
      cls."siakPeriodeAkademikId",
      ps."siakFakultasId",
      ps.kode_prodi,
      ps.nama_prodi,
      ps.nama_fakultas,
      ps.jenjang,
      COALESCE(lecturers.total_lecturers, 0)::int AS total_lecturers,
      COALESCE(participants.total_participants, 0)::int AS total_participants,
      COALESCE(sections.total_sections, 0)::int AS total_sections
    ${baseFrom}
    LEFT JOIN (
      SELECT "kelasKuliahId", count(DISTINCT siak_dosen_id)::int AS total_lecturers
      FROM siak_v2_class_lecturers
      GROUP BY "kelasKuliahId"
    ) lecturers ON lecturers."kelasKuliahId" = cls."kelasKuliahId"
    LEFT JOIN (
      SELECT "kelasKuliahId", count(DISTINCT siak_mahasiswa_id)::int AS total_participants
      FROM siak_v2_participants
      GROUP BY "kelasKuliahId"
    ) participants ON participants."kelasKuliahId" = cls."kelasKuliahId"
    LEFT JOIN (
      SELECT "kelasKuliahId", count(*)::int AS total_sections
      FROM lms_sections
      WHERE deleted_at IS NULL
      GROUP BY "kelasKuliahId"
    ) sections ON sections."kelasKuliahId" = cls."kelasKuliahId"
    ${whereSql}
    ORDER BY cls.kode_matakuliah ASC NULLS LAST, cls.nama ASC
    LIMIT :limit OFFSET :offset`,
    { replacements }
  );

  return {
    limit,
    page,
    total: countRows[0].total,
    total_page: Math.ceil(countRows[0].total / limit),
    rows,
  };
}

module.exports = {
  buildClassAccess,
  listLmsClasses,
};
