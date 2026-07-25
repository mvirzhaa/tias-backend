const db = require("../../config");

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;
const ALLOWED_STATUSES = new Set(["pending", "verified", "active", "rejected", "ignored"]);

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

const normalizeStatus = (value, fallback = "pending") => {
  const status = String(value || fallback).trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`Status mapping tidak valid: ${value}`);
  }
  return status;
};

async function getMappingSummary() {
  const [rows] = await db.query(`
    WITH code_candidates AS (
      SELECT
        lu.matakuliah_id,
        su.mata_kuliah_id,
        mk.sks AS sks_lokal,
        c.sks AS sks_siak
      FROM (
        SELECT upper(trim(kode_matakuliah)) AS code_key, min(id) AS matakuliah_id
        FROM m_matakuliah
        WHERE deleted_at IS NULL AND NULLIF(trim(kode_matakuliah), '') IS NOT NULL
        GROUP BY upper(trim(kode_matakuliah))
        HAVING count(*) = 1
      ) lu
      JOIN (
        SELECT upper(trim(kode_matakuliah)) AS code_key, min(mata_kuliah_id) AS mata_kuliah_id
        FROM siak_sync_courses
        WHERE is_active = true AND NULLIF(trim(kode_matakuliah), '') IS NOT NULL
        GROUP BY upper(trim(kode_matakuliah))
        HAVING count(*) = 1
      ) su ON su.code_key = lu.code_key
      JOIN m_matakuliah mk ON mk.id = lu.matakuliah_id
      JOIN siak_sync_courses c ON c.mata_kuliah_id = su.mata_kuliah_id
      WHERE NOT EXISTS (
        SELECT 1 FROM matakuliah_siak_mapping map
        WHERE map.matakuliah_id = lu.matakuliah_id OR map.mata_kuliah_id = su.mata_kuliah_id
      )
    )
    SELECT
      (SELECT count(*)::int FROM m_matakuliah WHERE deleted_at IS NULL) AS local_courses,
      (SELECT count(*)::int FROM siak_sync_courses WHERE is_active = true) AS siak_courses,
      (SELECT count(*)::int FROM matakuliah_siak_mapping) AS mapped_courses,
      (SELECT count(*)::int FROM matakuliah_siak_mapping WHERE status IN ('verified', 'active')) AS verified_mappings,
      (SELECT count(*)::int FROM matakuliah_siak_mapping WHERE status = 'pending') AS pending_mappings,
      (
        SELECT count(*)::int
        FROM siak_sync_courses c
        LEFT JOIN matakuliah_siak_mapping map ON map.mata_kuliah_id = c.mata_kuliah_id
        WHERE c.is_active = true AND map.id IS NULL
      ) AS unmapped_siak_courses,
      (
        SELECT count(*)::int
        FROM m_matakuliah mk
        LEFT JOIN matakuliah_siak_mapping map ON map.matakuliah_id = mk.id
        WHERE mk.deleted_at IS NULL AND map.id IS NULL
      ) AS unmapped_local_courses,
      (
        SELECT count(*)::int
        FROM code_candidates
        WHERE sks_lokal = sks_siak OR sks_lokal IS NULL OR sks_siak IS NULL
      ) AS auto_code_candidates,
      (
        SELECT count(*)::int
        FROM code_candidates
        WHERE NOT (sks_lokal = sks_siak OR sks_lokal IS NULL OR sks_siak IS NULL)
      ) AS review_code_candidates
  `);

  return rows[0];
}

async function listAutoCodeCandidates(limit) {
  const [rows] = await db.query(`
    WITH local_unique AS (
      SELECT upper(trim(kode_matakuliah)) AS code_key, min(id) AS matakuliah_id
      FROM m_matakuliah
      WHERE deleted_at IS NULL AND NULLIF(trim(kode_matakuliah), '') IS NOT NULL
      GROUP BY upper(trim(kode_matakuliah))
      HAVING count(*) = 1
    ),
    siak_unique AS (
      SELECT upper(trim(kode_matakuliah)) AS code_key, min(mata_kuliah_id) AS mata_kuliah_id
      FROM siak_sync_courses
      WHERE is_active = true AND NULLIF(trim(kode_matakuliah), '') IS NOT NULL
      GROUP BY upper(trim(kode_matakuliah))
      HAVING count(*) = 1
    )
    SELECT
      mk.id AS matakuliah_id,
      mk.kode_matakuliah AS kode_matakuliah_lokal,
      mk.nama_matakuliah AS nama_matakuliah_lokal,
      mk.sks AS sks_lokal,
      c.mata_kuliah_id,
      c.kode_matakuliah AS kode_matakuliah_siak,
      c.nama_matakuliah AS nama_matakuliah_siak,
      c.sks AS sks_siak,
      c.prodi_id,
      c.kurikulum_id,
      CASE WHEN mk.sks = c.sks THEN true ELSE false END AS sks_match,
      CASE WHEN mk.sks = c.sks OR mk.sks IS NULL OR c.sks IS NULL THEN true ELSE false END AS can_auto_map,
      CASE
        WHEN mk.sks = c.sks THEN NULL
        WHEN mk.sks IS NULL OR c.sks IS NULL THEN 'SKS belum lengkap, boleh auto-map tapi tetap perlu verifikasi.'
        ELSE 'Kode cocok, tetapi SKS lokal dan SIAK berbeda. Review manual dulu.'
      END AS review_reason
    FROM local_unique lu
    JOIN siak_unique su ON su.code_key = lu.code_key
    JOIN m_matakuliah mk ON mk.id = lu.matakuliah_id
    JOIN siak_sync_courses c ON c.mata_kuliah_id = su.mata_kuliah_id
    WHERE NOT EXISTS (
      SELECT 1 FROM matakuliah_siak_mapping map
      WHERE map.matakuliah_id = mk.id OR map.mata_kuliah_id = c.mata_kuliah_id
    )
    ORDER BY mk.kode_matakuliah
    LIMIT :limit
  `, {
    replacements: { limit },
  });

  return rows;
}

async function listCourseMappings(options = {}) {
  const limit = normalizeLimit(options.limit);
  const page = normalizePage(options.page);
  const offset = (page - 1) * limit;
  const replacements = {
    limit,
    offset,
    status: options.status ? normalizeStatus(options.status) : null,
    search: options.search ? `%${String(options.search).trim()}%` : null,
  };

  const where = [];
  if (replacements.status) where.push("map.status = :status");
  if (replacements.search) {
    where.push(`(
      mk.kode_matakuliah ILIKE :search OR
      mk.nama_matakuliah ILIKE :search OR
      c.kode_matakuliah ILIKE :search OR
      c.nama_matakuliah ILIKE :search OR
      c.mata_kuliah_id ILIKE :search
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.query(`
    SELECT count(*)::int AS total
    FROM matakuliah_siak_mapping map
    LEFT JOIN m_matakuliah mk ON mk.id = map.matakuliah_id
    LEFT JOIN siak_sync_courses c ON c.mata_kuliah_id = map.mata_kuliah_id
    ${whereSql}
  `, { replacements });

  const [rows] = await db.query(`
    SELECT
      map.id,
      map.status,
      map.mapping_method,
      map.notes,
      map.verified_at,
      map.verified_by,
      map.created_at,
      map.updated_at,
      mk.id AS matakuliah_id,
      mk.kode_matakuliah AS kode_matakuliah_lokal,
      mk.nama_matakuliah AS nama_matakuliah_lokal,
      mk.sks AS sks_lokal,
      c.mata_kuliah_id,
      c.kode_matakuliah AS kode_matakuliah_siak,
      c.nama_matakuliah AS nama_matakuliah_siak,
      c.sks AS sks_siak,
      c.prodi_id,
      c.kurikulum_id,
      CASE WHEN mk.sks = c.sks THEN true ELSE false END AS sks_match
    FROM matakuliah_siak_mapping map
    LEFT JOIN m_matakuliah mk ON mk.id = map.matakuliah_id
    LEFT JOIN siak_sync_courses c ON c.mata_kuliah_id = map.mata_kuliah_id
    ${whereSql}
    ORDER BY map.created_at DESC, map.id DESC
    LIMIT :limit OFFSET :offset
  `, { replacements });

  const total = countRows[0].total;
  const summary = await getMappingSummary();
  const code_match_candidates = await listAutoCodeCandidates(limit);

  return {
    limit,
    page,
    total,
    total_page: Math.ceil(total / limit),
    summary,
    rows,
    auto_code_candidates: code_match_candidates.filter((row) => row.can_auto_map),
    review_code_candidates: code_match_candidates.filter((row) => !row.can_auto_map),
    code_match_candidates,
  };
}

async function autoMapCoursesByCode() {
  const [rows] = await db.query(`
    WITH local_unique AS (
      SELECT upper(trim(kode_matakuliah)) AS code_key, min(id) AS matakuliah_id
      FROM m_matakuliah
      WHERE deleted_at IS NULL AND NULLIF(trim(kode_matakuliah), '') IS NOT NULL
      GROUP BY upper(trim(kode_matakuliah))
      HAVING count(*) = 1
    ),
    siak_unique AS (
      SELECT upper(trim(kode_matakuliah)) AS code_key, min(mata_kuliah_id) AS mata_kuliah_id
      FROM siak_sync_courses
      WHERE is_active = true AND NULLIF(trim(kode_matakuliah), '') IS NOT NULL
      GROUP BY upper(trim(kode_matakuliah))
      HAVING count(*) = 1
    ),
    candidates AS (
      SELECT
        mk.id AS matakuliah_id,
        mk.kode_matakuliah AS kode_matakuliah_lokal,
        c.mata_kuliah_id,
        c.kode_matakuliah AS kode_matakuliah_siak
      FROM local_unique lu
      JOIN siak_unique su ON su.code_key = lu.code_key
      JOIN m_matakuliah mk ON mk.id = lu.matakuliah_id
      JOIN siak_sync_courses c ON c.mata_kuliah_id = su.mata_kuliah_id
      WHERE NOT EXISTS (
        SELECT 1 FROM matakuliah_siak_mapping map
        WHERE map.matakuliah_id = mk.id OR map.mata_kuliah_id = c.mata_kuliah_id
      )
      AND (mk.sks = c.sks OR mk.sks IS NULL OR c.sks IS NULL)
    )
    INSERT INTO matakuliah_siak_mapping (
      matakuliah_id,
      kode_matakuliah_lokal,
      mata_kuliah_id,
      kode_matakuliah_siak,
      status,
      mapping_method,
      notes,
      created_at,
      updated_at
    )
    SELECT
      matakuliah_id,
      kode_matakuliah_lokal,
      mata_kuliah_id,
      kode_matakuliah_siak,
      'pending',
      'auto_code_exact',
      'Auto mapped by exact course code. Needs admin verification.',
      NOW(),
      NOW()
    FROM candidates
    ON CONFLICT DO NOTHING
    RETURNING *
  `);

  return {
    inserted: rows.length,
    rows,
    summary: await getMappingSummary(),
  };
}

async function createCourseMapping(payload = {}) {
  const matakuliahId = parseInt(payload.matakuliah_id, 10);
  const mataKuliahId = String(payload.mata_kuliah_id || "").trim();
  if (!matakuliahId || !mataKuliahId) {
    throw new Error("matakuliah_id dan mata_kuliah_id wajib diisi.");
  }

  const status = normalizeStatus(payload.status, "pending");
  const [rows] = await db.query(`
    INSERT INTO matakuliah_siak_mapping (
      matakuliah_id,
      kode_matakuliah_lokal,
      mata_kuliah_id,
      kode_matakuliah_siak,
      status,
      mapping_method,
      notes,
      verified_at,
      verified_by,
      created_at,
      updated_at
    )
    SELECT
      mk.id,
      mk.kode_matakuliah,
      c.mata_kuliah_id,
      c.kode_matakuliah,
      :status,
      'manual',
      :notes,
      CASE WHEN :status IN ('verified', 'active') THEN NOW() ELSE NULL END,
      CASE WHEN :status IN ('verified', 'active') THEN CAST(:verifiedBy AS uuid) ELSE NULL END,
      NOW(),
      NOW()
    FROM m_matakuliah mk
    JOIN siak_sync_courses c ON c.mata_kuliah_id = :mataKuliahId
    WHERE mk.id = :matakuliahId AND mk.deleted_at IS NULL
    RETURNING *
  `, {
    replacements: {
      matakuliahId,
      mataKuliahId,
      status,
      notes: payload.notes || null,
      verifiedBy: payload.verified_by || null,
    },
  });

  if (!rows.length) {
    throw new Error("Mata kuliah lokal atau mata kuliah SIAK tidak ditemukan.");
  }

  return rows[0];
}

async function updateCourseMapping(id, payload = {}) {
  const mappingId = parseInt(id, 10);
  if (!mappingId) throw new Error("ID mapping tidak valid.");

  const hasStatus = payload.status !== undefined && payload.status !== null;
  const status = hasStatus ? normalizeStatus(payload.status) : null;

  const [rows] = await db.query(`
    UPDATE matakuliah_siak_mapping
    SET
      status = COALESCE(:status, status),
      notes = COALESCE(:notes, notes),
      verified_at = CASE
        WHEN :status IN ('verified', 'active') THEN NOW()
        WHEN :status IN ('pending', 'rejected', 'ignored') THEN NULL
        ELSE verified_at
      END,
      verified_by = CASE
        WHEN :status IN ('verified', 'active') THEN CAST(:verifiedBy AS uuid)
        WHEN :status IN ('pending', 'rejected', 'ignored') THEN NULL
        ELSE verified_by
      END,
      updated_at = NOW()
    WHERE id = :id
    RETURNING *
  `, {
    replacements: {
      id: mappingId,
      status,
      notes: payload.notes === undefined ? null : payload.notes,
      verifiedBy: payload.verified_by || null,
    },
  });

  if (!rows.length) throw new Error("Mapping tidak ditemukan.");
  return rows[0];
}

async function deleteCourseMapping(id) {
  const mappingId = parseInt(id, 10);
  if (!mappingId) throw new Error("ID mapping tidak valid.");

  const [rows] = await db.query(`
    DELETE FROM matakuliah_siak_mapping
    WHERE id = :id
    RETURNING *
  `, {
    replacements: { id: mappingId },
  });

  if (!rows.length) throw new Error("Mapping tidak ditemukan.");
  return rows[0];
}

module.exports = {
  listCourseMappings,
  autoMapCoursesByCode,
  createCourseMapping,
  updateCourseMapping,
  deleteCourseMapping,
};
