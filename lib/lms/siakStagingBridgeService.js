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

// Sebelumnya periode "aktif" di-hardcode ke satu UUID tetap di kode (mis. "2025 Ganjil"), lalu
// sempat diganti ke "periode dengan kelas is_active terbanyak" — TAPI data riil menunjukkan SIAK
// menjalankan BANYAK periode akademik aktif SECARA BERSAMAAN (5+ UUID periode berbeda, masing-
// masing puluhan kelas is_active=true di waktu yang sama — kemungkinan per jalur/kelas karyawan,
// S1/S2, dll, bukan satu semester = satu UUID). Memilih "periode terbanyak" membuang kelas dosen
// yang seluruh kelasnya kebetulan ada di periode yang lebih kecil (kasus nyata: dosen dengan 12
// kelas aktif tersebar di 3 UUID periode, tidak satu pun cocok dengan UUID "terbanyak").
//
// Jadi TIDAK ADA konsep "satu periode aktif" yang valid untuk difilter di sini. Cukup andalkan
// `is_active` — itu sudah sinyal per-kelas dari SIAK sendiri (statusKelas, direfresh tiap sync,
// lihat syncService.isAktif), tidak perlu ditebak/dipersempit lagi ke satu periode tertentu.
async function listLmsClasses(options = {}) {
  const limit = normalizeLimit(options.limit);
  const page = normalizePage(options.page);
  const offset = (page - 1) * limit;
  const access = await buildClassAccess(options.user);

  // Escape hatch admin-only: lihat juga kelas "kosong" (0 dosen & 0 peserta) yang secara
  // default disembunyikan (lihat filter di bawah) — supaya tetap bisa diaudit/dibersihkan,
  // bukan hilang permanen dari sistem.
  const includeEmpty = options.includeEmpty === true && options.user && options.user.role === "Admin";

  const replacements = {
    limit,
    offset,
    search: options.search ? `%${String(options.search).trim()}%` : null,
    ...access.replacements,
  };

  const where = ['cls.is_active = true'];
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
  // HANYA sembunyikan kelas kosong (0 dosen & 0 peserta) yang punya KEMBARAN kode+nama+label
  // sama persis yang SUDAH terisi (pola "Pancasila Kelas Reguler A" muncul 4x di periode
  // berbeda, 3 di antaranya kosong). Kelas kosong yang BERDIRI SENDIRI (mis. pelatihan/kelas
  // baru yang belum ada peserta sama sekali, tidak ada kembaran terisi) TETAP tampil — versi
  // pertama filter ini salah memukul-rata semua kelas kosong dan ikut menyembunyikan kelas sah
  // (mis. "Pelatihan AA"/"Pelatihan PEKERTI" yang judulnya unik, bukan duplikat siapa pun).
  if (!includeEmpty) {
    where.push(`NOT (
      NOT EXISTS (SELECT 1 FROM siak_v2_class_lecturers l WHERE l."kelasKuliahId" = cls."kelasKuliahId")
      AND NOT EXISTS (SELECT 1 FROM siak_v2_participants p WHERE p."kelasKuliahId" = cls."kelasKuliahId")
      AND EXISTS (
        SELECT 1 FROM siak_v2_classes sibling
        WHERE sibling."kelasKuliahId" <> cls."kelasKuliahId"
          AND sibling.is_active = true
          AND sibling.kode_matakuliah IS NOT DISTINCT FROM cls.kode_matakuliah
          AND sibling.nama IS NOT DISTINCT FROM cls.nama
          AND (
            EXISTS (SELECT 1 FROM siak_v2_class_lecturers l2 WHERE l2."kelasKuliahId" = sibling."kelasKuliahId")
            OR EXISTS (SELECT 1 FROM siak_v2_participants p2 WHERE p2."kelasKuliahId" = sibling."kelasKuliahId")
          )
      )
    )`);
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
      cls.nama_periode,
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
