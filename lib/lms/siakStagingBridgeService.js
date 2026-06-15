const { Op } = require("sequelize");
const db = require("../../config");
const SiakV2Class = require("../../models/lms/SiakV2Class");
const SiakV2Participant = require("../../models/lms/SiakV2Participant");
const { getUserRoleScopes } = require("./roleScopeService");

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

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (error) {
      return [value].filter(Boolean);
    }
  }
  return [];
};

async function readClassesFromStaging(options = {}) {
  const replacements = {
    semester: options.semester || null,
  };

  const [rows] = await db.query(`
    SELECT
      cls.kelas_kuliah_id AS "kelasKuliahId",
      c.kode_matakuliah,
      c.nama_matakuliah,
      cls.nama_kelas,
      cls.semester,
      COALESCE(
        jsonb_agg(DISTINCT l.nip) FILTER (
          WHERE NULLIF(trim(l.nip), '') IS NOT NULL AND l.is_active = true
        ),
        '[]'::jsonb
      ) AS dosen_pengampu_nip
    FROM siak_sync_classes cls
    LEFT JOIN siak_sync_courses c ON c.mata_kuliah_id = cls.mata_kuliah_id
    LEFT JOIN siak_sync_class_lecturers l ON l.kelas_kuliah_id = cls.kelas_kuliah_id
    WHERE cls.is_active = true
      AND (:semester IS NULL OR cls.semester = :semester)
    GROUP BY
      cls.kelas_kuliah_id,
      c.kode_matakuliah,
      c.nama_matakuliah,
      cls.nama_kelas,
      cls.semester
    ORDER BY cls.semester DESC, c.kode_matakuliah ASC, cls.nama_kelas ASC
  `, { replacements });

  return rows.map((row) => ({
    ...row,
    dosen_pengampu_nip: normalizeArray(row.dosen_pengampu_nip),
  }));
}

async function readParticipantsFromStaging(options = {}) {
  const replacements = {
    semester: options.semester || null,
  };

  const [rows] = await db.query(`
    SELECT
      p.kelas_kuliah_id AS "kelasKuliahId",
      p.npm
    FROM siak_sync_class_participants p
    INNER JOIN siak_sync_classes cls ON cls.kelas_kuliah_id = p.kelas_kuliah_id
    WHERE cls.is_active = true
      AND p.is_active = true
      AND NULLIF(trim(p.npm), '') IS NOT NULL
      AND (:semester IS NULL OR cls.semester = :semester)
    ORDER BY p.kelas_kuliah_id, p.npm
  `, { replacements });

  return rows;
}

async function syncLmsClassTablesFromStaging(options = {}) {
  const [classes, participants] = await Promise.all([
    readClassesFromStaging(options),
    readParticipantsFromStaging(options),
  ]);

  const classIds = classes.map((row) => row.kelasKuliahId);

  await db.transaction(async (transaction) => {
    const now = new Date();

    if (classes.length) {
      await SiakV2Class.bulkCreate(
        classes.map((row) => ({
          kelasKuliahId: row.kelasKuliahId,
          kode_matakuliah: row.kode_matakuliah,
          nama_matakuliah: row.nama_matakuliah,
          nama_kelas: row.nama_kelas,
          dosen_pengampu_nip: row.dosen_pengampu_nip,
          semester: row.semester,
          created_at: now,
          updated_at: now,
        })),
        {
          transaction,
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

    if (classIds.length) {
      await SiakV2Participant.destroy({
        where: { kelasKuliahId: { [Op.in]: classIds } },
        transaction,
      });
    }

    if (participants.length) {
      await SiakV2Participant.bulkCreate(
        participants.map((row) => ({
          kelasKuliahId: row.kelasKuliahId,
          npm: row.npm,
          created_at: now,
          updated_at: now,
        })),
        { transaction }
      );
    }
  });

  const classesWithoutLecturers = classes
    .filter((row) => !row.dosen_pengampu_nip.length)
    .map((row) => row.kelasKuliahId);

  return {
    source: "siak_sync_staging",
    semester: options.semester || null,
    classes: classes.length,
    participants: participants.length,
    classes_without_lecturers: classesWithoutLecturers,
    synced_at: new Date(),
  };
}

async function buildClassAccess(user) {
  if (!user) return { unrestricted: false, conditions: [], replacements: {} };
  if (user.role === "Admin") return { unrestricted: true, conditions: [], replacements: {} };

  const conditions = [];
  const replacements = {};

  // Identitas lokal (tb_users.npm / tb_data_pribadi.nip) bertipe CHAR → ada padding spasi.
  // Bandingkan dengan btrim() di kedua sisi agar cocok dgn data SIAK (varchar, tanpa padding).
  if ((user.role === "Dosen" || user.role === "Dosen_Ext") && user.nip) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM siak_sync_class_lecturers lecturer_access
      WHERE lecturer_access.kelas_kuliah_id = cls.kelas_kuliah_id
        AND lecturer_access.is_active = true
        AND btrim(lecturer_access.nip) = btrim(:nip)
    )`);
    replacements.nip = user.nip;
  }

  if (user.role === "Mahasiswa" && user.npm) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM siak_sync_class_participants participant_access
      WHERE participant_access.kelas_kuliah_id = cls.kelas_kuliah_id
        AND participant_access.is_active = true
        AND btrim(participant_access.npm) = btrim(:npm)
    )`);
    replacements.npm = user.npm;
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
    conditions.push("sp.fakultas_id IN (:facultyIds)");
    replacements.facultyIds = facultyIds;
  }
  if (prodiIds.length) {
    conditions.push("cls.prodi_id IN (:prodiIds)");
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
    semester: options.semester || null,
    search: options.search ? `%${String(options.search).trim()}%` : null,
    ...access.replacements,
  };

  const where = ["cls.is_active = true"];
  if (replacements.semester) where.push("cls.semester = :semester");
  if (replacements.search) {
    where.push(`(
      c.kode_matakuliah ILIKE :search OR
      c.nama_matakuliah ILIKE :search OR
      cls.nama_kelas ILIKE :search OR
      sp.nama_prodi ILIKE :search OR
      f.nama_fakultas ILIKE :search
    )`);
  }
  if (!access.unrestricted) {
    where.push(access.conditions.length ? `(${access.conditions.join(" OR ")})` : "false");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const baseFrom = `
    FROM siak_sync_classes cls
    LEFT JOIN siak_sync_courses c ON c.mata_kuliah_id = cls.mata_kuliah_id
    LEFT JOIN siak_sync_study_programs sp ON sp.prodi_id = cls.prodi_id
    LEFT JOIN siak_sync_faculties f ON f.fakultas_id = sp.fakultas_id
  `;

  const [countRows] = await db.query(`
    SELECT count(*)::int AS total
    ${baseFrom}
    ${whereSql}
  `, { replacements });

  const [rows] = await db.query(`
    SELECT
      cls.kelas_kuliah_id AS "kelasKuliahId",
      cls.semester,
      cls.nama_kelas,
      cls.prodi_id,
      c.mata_kuliah_id,
      c.kode_matakuliah,
      c.nama_matakuliah,
      c.sks,
      sp.kode_prodi,
      sp.nama_prodi,
      sp.fakultas_id,
      f.kode_fakultas,
      f.nama_fakultas,
      COALESCE(lecturers.dosen_pengampu_nip, '[]'::jsonb) AS dosen_pengampu_nip,
      COALESCE(lecturers.total_lecturers, 0)::int AS total_lecturers,
      COALESCE(participants.total_participants, 0)::int AS total_participants,
      COALESCE(sections.total_sections, 0)::int AS total_sections
    ${baseFrom}
    LEFT JOIN (
      SELECT
        kelas_kuliah_id,
        jsonb_agg(DISTINCT nip) FILTER (WHERE NULLIF(trim(nip), '') IS NOT NULL) AS dosen_pengampu_nip,
        count(DISTINCT nip) FILTER (WHERE NULLIF(trim(nip), '') IS NOT NULL)::int AS total_lecturers
      FROM siak_sync_class_lecturers
      WHERE is_active = true
      GROUP BY kelas_kuliah_id
    ) lecturers ON lecturers.kelas_kuliah_id = cls.kelas_kuliah_id
    LEFT JOIN (
      SELECT kelas_kuliah_id, count(DISTINCT npm)::int AS total_participants
      FROM siak_sync_class_participants
      WHERE is_active = true
      GROUP BY kelas_kuliah_id
    ) participants ON participants.kelas_kuliah_id = cls.kelas_kuliah_id
    LEFT JOIN (
      SELECT "kelasKuliahId", count(*)::int AS total_sections
      FROM lms_sections
      WHERE deleted_at IS NULL
      GROUP BY "kelasKuliahId"
    ) sections ON sections."kelasKuliahId" = cls.kelas_kuliah_id
    ${whereSql}
    ORDER BY cls.semester DESC, c.kode_matakuliah ASC, cls.nama_kelas ASC
    LIMIT :limit OFFSET :offset
  `, { replacements });

  return {
    limit,
    page,
    total: countRows[0].total,
    total_page: Math.ceil(countRows[0].total / limit),
    rows: rows.map((row) => ({
      ...row,
      dosen_pengampu_nip: normalizeArray(row.dosen_pengampu_nip),
    })),
  };
}

module.exports = {
  readClassesFromStaging,
  readParticipantsFromStaging,
  syncLmsClassTablesFromStaging,
  listLmsClasses,
};
