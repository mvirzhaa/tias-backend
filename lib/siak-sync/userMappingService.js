const db = require("../../config");

/**
 * userMappingService.js — BRIEF v2 Task 6.
 * Mekanisme utama linking dosen/mahasiswa TIAS ↔ SIAK v2 via siak_user_mappings.
 * Admin-only. verified tidak boleh diturunkan oleh sync otomatis.
 */

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

const ALLOWED_STATUSES = new Set(["auto", "verified", "rejected"]);
const ALLOWED_ROLES = new Set(["Dosen", "Dosen_Ext", "Mahasiswa"]);
const ALLOWED_IDENTIFIER_TYPES = new Set(["nidn", "npm", "manual"]);

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

/**
 * listUserMappings — GET /siak-sync/user-mappings
 * Diturunkan live dari siak_user_mappings + tb_users + tb_data_pribadi.
 * Filter: status, role, identifier_type.
 */
async function listUserMappings(options = {}) {
  const limit = normalizeLimit(options.limit);
  const page = normalizePage(options.page);
  const offset = (page - 1) * limit;

  // Validate filters
  if (options.status && !ALLOWED_STATUSES.has(options.status)) {
    throw new Error(`Status tidak valid: ${options.status}. Gunakan: auto, verified, rejected.`);
  }
  if (options.role && !ALLOWED_ROLES.has(options.role)) {
    throw new Error(`Role tidak valid: ${options.role}. Gunakan: Dosen, Dosen_Ext, Mahasiswa.`);
  }
  if (options.identifier_type && !ALLOWED_IDENTIFIER_TYPES.has(options.identifier_type)) {
    throw new Error(`identifier_type tidak valid: ${options.identifier_type}. Gunakan: nidn, npm, manual.`);
  }

  const conditions = [];
  const replacements = { limit, offset };

  if (options.status) {
    conditions.push("m.status = :status");
    replacements.status = options.status;
  }
  if (options.role) {
    conditions.push("u.role = :role");
    replacements.role = options.role;
  }
  if (options.identifier_type) {
    conditions.push("m.identifier_type = :identifier_type");
    replacements.identifier_type = options.identifier_type;
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `SELECT count(*)::int AS total
     FROM siak_user_mappings m
     JOIN tb_users u ON u.user_id = m.tias_user_id
     ${whereSql}`,
    { replacements }
  );

  const [rows] = await db.query(
    `SELECT
       m.id,
       m.tias_user_id,
       m.siak_user_uuid,
       m.identifier,
       m.identifier_type,
       m.matched_via,
       m.status,
       m.matched_at,
       m.verified_by,
       m.created_at,
       m.updated_at,
       u.role,
       u.email      AS tias_email,
       u.nidn       AS tias_nidn,
       u.npm        AS tias_npm,
       dp.nama_lengkap,
       dp.nip       AS tias_nip,
       vb.email     AS verified_by_email
     FROM siak_user_mappings m
     JOIN tb_users u ON u.user_id = m.tias_user_id
     LEFT JOIN tb_data_pribadi dp ON dp.user_id = m.tias_user_id
     LEFT JOIN tb_users vb ON vb.user_id = m.verified_by
     ${whereSql}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT :limit OFFSET :offset`,
    { replacements }
  );

  const total = countRows[0].total;

  // Summary counts per status
  const [summary] = await db.query(
    `SELECT
       count(*)::int                                              AS total_mappings,
       count(*) FILTER (WHERE status = 'auto')::int              AS auto_count,
       count(*) FILTER (WHERE status = 'verified')::int          AS verified_count,
       count(*) FILTER (WHERE status = 'rejected')::int          AS rejected_count
     FROM siak_user_mappings`
  );

  return {
    limit,
    page,
    total,
    total_page: Math.ceil(total / limit),
    summary: summary[0],
    rows,
  };
}

/**
 * listUnmatchedUsers — GET /siak-sync/user-mappings/unmatched
 * Dosen & mahasiswa di siak_v2_* yang belum ter-map di siak_user_mappings.
 *
 * Dosen: sertakan SARAN match berbasis nama (similarity pg_trgm, fallback ILIKE).
 *        JANGAN auto-link — hanya saran untuk dikonfirmasi admin.
 * Mahasiswa: sertakan match NPM langsung dari tb_users jika ada.
 */
async function listUnmatchedUsers() {
  // ── Cek apakah pg_trgm tersedia ──────────────────────────────────────────────
  let hasTrgm = false;
  try {
    await db.query("SELECT similarity('a','b')");
    hasTrgm = true;
  } catch {
    hasTrgm = false;
  }

  // ── 1. Dosen unmatched dari siak_v2_class_lecturers ─────────────────────────
  // Nama dosen diambil langsung dari siak_v2_class_lecturers.nama (diisi sync v2 dari
  // jadwalKuliah[].dosen.nama). nidn/nama identik per siak_dosen_id → max() aman.
  const [unmatchedDosen] = await db.query(`
    SELECT
      cl.siak_dosen_id                            AS "siak_dosen_id",
      max(btrim(cl.nidn))                         AS nidn_siak,
      max(cl.nama)                                AS nama_siak,
      count(DISTINCT cl."kelasKuliahId")::int     AS jumlah_kelas
    FROM siak_v2_class_lecturers cl
    WHERE NOT EXISTS (
      SELECT 1 FROM siak_user_mappings m
      WHERE m.siak_user_uuid = cl.siak_dosen_id
        AND m.status IN ('auto', 'verified')
    )
    GROUP BY cl.siak_dosen_id
    ORDER BY jumlah_kelas DESC, nama_siak ASC NULLS LAST
  `);

  // ── 2. Kandidat dosen TIAS ───────────────────────────────────────────────────
  const [tiasDosen] = await db.query(`
    SELECT
      u.user_id,
      u.nidn,
      u.role,
      u.email,
      dp.nama_lengkap,
      dp.nip
    FROM tb_users u
    LEFT JOIN tb_data_pribadi dp ON dp.user_id = u.user_id
    WHERE u.role IN ('Dosen', 'Dosen_Ext')
      AND u.deleted_at IS NULL
  `);

  // ── 3. Saran berbasis nama ────────────────────────────────────────────────────
  // Untuk setiap dosen SIAK yang unmatched, cari kandidat TIAS terdekat secara nama.
  // similarity() jika pg_trgm tersedia, fallback token ILIKE.
  const dosenWithSuggestions = unmatchedDosen.map((siakDosen) => {
    let candidates = [];

    if (!siakDosen.nama_siak) {
      // Tidak ada nama → tidak bisa generate saran
      return { ...siakDosen, name_suggestions: [] };
    }

    const namaSiakLower = siakDosen.nama_siak.toLowerCase().trim();

    if (hasTrgm) {
      // Hitung similarity di JS (pg_trgm query sudah di-query terpisah jika perlu,
      // tapi untuk hindari N+1, kita lakukan in-process dengan algoritma Jaccard trigram sederhana)
      candidates = tiasDosen
        .filter((t) => t.nama_lengkap)
        .map((t) => ({
          tias_user_id: t.user_id,
          nama_tias: t.nama_lengkap,
          nidn_tias: t.nidn,
          nip_tias: t.nip,
          role: t.role,
          email: t.email,
          score: trigramSimilarity(namaSiakLower, t.nama_lengkap.toLowerCase().trim()),
        }))
        .filter((c) => c.score >= 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    } else {
      // Fallback: token ILIKE — cek apakah ada kata >= 4 karakter yang match
      const tokens = namaSiakLower
        .split(/\s+/)
        .filter((t) => t.length >= 4);
      candidates = tiasDosen
        .filter((t) => {
          if (!t.nama_lengkap) return false;
          const tLower = t.nama_lengkap.toLowerCase();
          return tokens.some((tok) => tLower.includes(tok));
        })
        .map((t) => {
          const tLower = t.nama_lengkap.toLowerCase();
          const matchedTokens = tokens.filter((tok) => tLower.includes(tok));
          return {
            tias_user_id: t.user_id,
            nama_tias: t.nama_lengkap,
            nidn_tias: t.nidn,
            nip_tias: t.nip,
            role: t.role,
            email: t.email,
            score: matchedTokens.length / Math.max(tokens.length, 1),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

    return { ...siakDosen, name_suggestions: candidates };
  });

  // ── 4. Mahasiswa unmatched dari siak_v2_participants ─────────────────────────
  const [unmatchedMhs] = await db.query(`
    SELECT DISTINCT ON (p."siak_mahasiswa_id")
      p."siak_mahasiswa_id",
      p.npm,
      p.nama                        AS nama_siak,
      count(*) OVER (
        PARTITION BY p."siak_mahasiswa_id"
      )::int                        AS jumlah_kelas,
      -- Cari match langsung via NPM di tb_users (btrim: tb_users.npm CHAR ber-padding).
      u.user_id                     AS tias_user_id,
      u.email                       AS tias_email,
      dp.nama_lengkap               AS nama_tias,
      CASE
        WHEN u.user_id IS NOT NULL THEN 'npm_match'
        ELSE 'no_match'
      END                           AS match_status
    FROM siak_v2_participants p
    LEFT JOIN tb_users u
      ON btrim(u.npm) = btrim(p.npm) AND u.deleted_at IS NULL AND u.role = 'Mahasiswa'
    LEFT JOIN tb_data_pribadi dp ON dp.user_id = u.user_id
    WHERE p."siak_mahasiswa_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM siak_user_mappings m
        WHERE m.siak_user_uuid = p."siak_mahasiswa_id"
          AND m.status IN ('auto', 'verified')
      )
    ORDER BY p."siak_mahasiswa_id"
  `);

  return {
    dosen: {
      total: dosenWithSuggestions.length,
      rows: dosenWithSuggestions,
      note: "name_suggestions hanya saran — tidak otomatis di-link. Konfirmasi via POST /user-mappings.",
    },
    mahasiswa: {
      total: unmatchedMhs.length,
      rows: unmatchedMhs,
      note: "match_status='npm_match' artinya ada akun TIAS dengan NPM sama. Tetap perlu dikonfirmasi admin.",
    },
    similarity_engine: hasTrgm ? "pg_trgm" : "token_ilike_fallback",
  };
}

/**
 * Implementasi trigram similarity sederhana (Jaccard) di JS.
 * Dipakai sebagai in-process fallback agar tidak ada query N+1 ke DB.
 * Hasilnya mendekati pg_trgm similarity() untuk nama pendek.
 */
function trigramSimilarity(a, b) {
  const trigramsOf = (s) => {
    const padded = `  ${s} `;
    const result = new Set();
    for (let i = 0; i < padded.length - 2; i++) {
      result.add(padded.slice(i, i + 3));
    }
    return result;
  };
  const tA = trigramsOf(a);
  const tB = trigramsOf(b);
  let intersection = 0;
  for (const t of tA) {
    if (tB.has(t)) intersection++;
  }
  const union = tA.size + tB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * createUserMapping — POST /siak-sync/user-mappings
 * Buat mapping manual (tias_user_id ↔ siak_user_uuid).
 * matched_via = 'manual', status = 'verified', verified_by = adminUserId.
 * Hormati uq_sum_tias_user dan uq_sum_siak_user (tolak bila bentrok).
 */
async function createUserMapping(payload = {}, adminUserId) {
  const { tias_user_id, siak_user_uuid, notes } = payload;

  if (!tias_user_id) throw new Error("tias_user_id wajib diisi.");
  if (!siak_user_uuid) throw new Error("siak_user_uuid wajib diisi.");

  // Validasi format UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tias_user_id)) throw new Error("tias_user_id bukan UUID yang valid.");
  if (!uuidRegex.test(siak_user_uuid)) throw new Error("siak_user_uuid bukan UUID yang valid.");

  // Validasi tias_user_id ada di tb_users
  const [userRows] = await db.query(
    `SELECT user_id, role, nidn, npm FROM tb_users WHERE user_id = :tias_user_id AND deleted_at IS NULL`,
    { replacements: { tias_user_id } }
  );
  if (!userRows.length) {
    throw new Error(`User TIAS dengan id '${tias_user_id}' tidak ditemukan.`);
  }
  const tiasUser = userRows[0];

  // Tentukan identifier & identifier_type dari role user
  let identifier;
  let identifier_type;
  if (tiasUser.role === "Mahasiswa") {
    identifier = tiasUser.npm || siak_user_uuid;
    identifier_type = tiasUser.npm ? "npm" : "manual";
  } else if (tiasUser.role === "Dosen" || tiasUser.role === "Dosen_Ext") {
    identifier = tiasUser.nidn || siak_user_uuid;
    identifier_type = tiasUser.nidn ? "nidn" : "manual";
  } else {
    // Roles lain (Admin, dll) juga bisa di-map jika diperlukan
    identifier = siak_user_uuid;
    identifier_type = "manual";
  }

  // Cek conflict lebih dulu untuk pesan error yang deskriptif
  const [conflictCheck] = await db.query(
    `SELECT
       CASE WHEN tias_user_id = :tias_user_id THEN 'tias_user_id' ELSE 'siak_user_uuid' END AS conflict_field,
       tias_user_id,
       siak_user_uuid,
       status
     FROM siak_user_mappings
     WHERE tias_user_id = :tias_user_id OR siak_user_uuid = :siak_user_uuid`,
    { replacements: { tias_user_id, siak_user_uuid } }
  );

  if (conflictCheck.length) {
    const c = conflictCheck[0];
    if (c.tias_user_id === tias_user_id) {
      throw new Error(
        `User TIAS '${tias_user_id}' sudah ter-mapping ke siak_user_uuid '${c.siak_user_uuid}' (status: ${c.status}). Hapus atau update mapping yang ada.`
      );
    } else {
      throw new Error(
        `SIAK user UUID '${siak_user_uuid}' sudah di-mapping ke tias_user_id '${c.tias_user_id}' (status: ${c.status}). Satu akun SIAK hanya boleh terhubung ke satu akun TIAS.`
      );
    }
  }

  const [rows] = await db.query(
    `INSERT INTO siak_user_mappings (
       id,
       tias_user_id,
       siak_user_uuid,
       identifier,
       identifier_type,
       matched_via,
       status,
       matched_at,
       verified_by,
       created_at,
       updated_at
     ) VALUES (
       gen_random_uuid(),
       :tias_user_id,
       :siak_user_uuid,
       :identifier,
       :identifier_type,
       'manual',
       'verified',
       NOW(),
       :verified_by,
       NOW(),
       NOW()
     )
     RETURNING *`,
    {
      replacements: {
        tias_user_id,
        siak_user_uuid,
        identifier,
        identifier_type,
        verified_by: adminUserId || null,
      },
    }
  );

  return rows[0];
}

/**
 * updateUserMapping — PATCH /siak-sync/user-mappings/:id
 * Hanya boleh: * → verified | * → rejected.
 * Guard: verified tidak boleh diturunkan ke auto (penurunan sync).
 * verified bisa diubah ke rejected (koreksi admin), tapi tidak ke auto.
 */
async function updateUserMapping(id, payload = {}, adminUserId) {
  if (!id) throw new Error("ID mapping wajib diisi.");

  const { status, notes } = payload;

  if (!status) throw new Error("status wajib diisi (verified | rejected).");
  if (!["verified", "rejected"].includes(status)) {
    throw new Error(`Status tidak valid: '${status}'. PATCH hanya menerima: verified, rejected.`);
  }

  // Baca status saat ini
  const [existing] = await db.query(
    `SELECT id, status, tias_user_id FROM siak_user_mappings WHERE id = :id`,
    { replacements: { id } }
  );
  if (!existing.length) throw new Error(`Mapping dengan id '${id}' tidak ditemukan.`);

  const current = existing[0];

  // Tidak ada perubahan
  if (current.status === status) {
    throw new Error(`Mapping sudah berstatus '${status}'. Tidak ada perubahan.`);
  }

  // Guard: verified tidak boleh diturunkan ke auto oleh siapapun (termasuk admin)
  // Note: auto hanya bisa di-set oleh proses sync otomatis, bukan PATCH manual.
  // PATCH manual hanya boleh menghasilkan verified atau rejected.
  // (Jika di masa depan perlu reset ke auto, butuh endpoint khusus)

  const verifiedFields =
    status === "verified"
      ? `matched_at = NOW(), verified_by = :verified_by`
      : `verified_by = NULL, matched_at = matched_at`; // keep matched_at saat rejected

  const [rows] = await db.query(
    `UPDATE siak_user_mappings
     SET
       status     = :status,
       ${verifiedFields},
       updated_at = NOW()
     WHERE id = :id
     RETURNING *`,
    {
      replacements: {
        id,
        status,
        verified_by: status === "verified" ? (adminUserId || null) : null,
      },
    }
  );

  return rows[0];
}

module.exports = {
  listUserMappings,
  listUnmatchedUsers,
  createUserMapping,
  updateUserMapping,
};
