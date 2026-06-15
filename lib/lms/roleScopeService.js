const { Op } = require("sequelize");
const db = require("../../config");
const LmsRoleScope = require("../../models/lms/LmsRoleScope");
const User = require("../../models/User");

const ROLE_SCOPE_MAP = {
  lms_admin_univ: "university",
  lms_admin_fakultas: "faculty",
  lms_admin_prodi: "study_program",
};

const ROLE_ALIASES = {
  admin_univ: "lms_admin_univ",
  admin_university: "lms_admin_univ",
  admin_fakultas: "lms_admin_fakultas",
  admin_faculty: "lms_admin_fakultas",
  admin_prodi: "lms_admin_prodi",
  admin_study_program: "lms_admin_prodi",
};

const DEFAULT_PERMISSIONS = {
  lms_view: true,
  lms_report: true,
  lms_manage_content: false,
  siak_sync: false,
};

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

const normalizeRoleKey = (value) => {
  const key = String(value || "").trim().toLowerCase();
  const normalized = ROLE_ALIASES[key] || key;
  if (!ROLE_SCOPE_MAP[normalized]) {
    throw new Error(`role_key LMS tidak valid: ${value}`);
  }
  return normalized;
};

const normalizeScopeType = (roleKey, value) => {
  const expected = ROLE_SCOPE_MAP[roleKey];
  const scopeType = value ? String(value).trim().toLowerCase() : expected;
  if (!["university", "faculty", "study_program"].includes(scopeType)) {
    throw new Error(`scope_type LMS tidak valid: ${value}`);
  }
  if (scopeType !== expected) {
    throw new Error(`scope_type ${scopeType} tidak sesuai dengan role_key ${roleKey}`);
  }
  return scopeType;
};

const mergePermissions = (roleKey, permissions = {}) => ({
  ...DEFAULT_PERMISSIONS,
  ...(roleKey === "lms_admin_univ" ? { siak_sync: false } : {}),
  ...permissions,
});

async function assertUserExists(userId) {
  const user = await User.findOne({
    where: { user_id: userId },
    attributes: ["user_id", "role", "email", "npm", "nidn"],
  });
  if (!user) throw new Error("User tidak ditemukan.");
  return user;
}

async function resolveAcademicScope({ role_key, scope_type, fakultas_id, prodi_id }) {
  if (scope_type === "university") {
    return { fakultas_id: null, prodi_id: null };
  }

  if (scope_type === "faculty") {
    if (!fakultas_id) throw new Error("fakultas_id wajib diisi untuk Admin Fakultas.");
    const [rows] = await db.query(
      `SELECT fakultas_id FROM siak_sync_faculties WHERE fakultas_id = :fakultasId LIMIT 1`,
      { replacements: { fakultasId: fakultas_id } }
    );
    if (!rows.length) throw new Error("fakultas_id tidak ditemukan di staging SIAK.");
    return { fakultas_id, prodi_id: null };
  }

  if (scope_type === "study_program") {
    if (!prodi_id) throw new Error("prodi_id wajib diisi untuk Admin Prodi.");
    const [rows] = await db.query(
      `SELECT prodi_id, fakultas_id FROM siak_sync_study_programs WHERE prodi_id = :prodiId LIMIT 1`,
      { replacements: { prodiId: prodi_id } }
    );
    if (!rows.length) throw new Error("prodi_id tidak ditemukan di staging SIAK.");
    return { fakultas_id: fakultas_id || rows[0].fakultas_id || null, prodi_id };
  }

  throw new Error(`Scope akademik tidak valid untuk ${role_key}.`);
}

async function createRoleScope(payload = {}, actorId = null) {
  const role_key = normalizeRoleKey(payload.role_key);
  const scope_type = normalizeScopeType(role_key, payload.scope_type);
  const user_id = String(payload.user_id || "").trim();
  if (!user_id) throw new Error("user_id wajib diisi.");

  await assertUserExists(user_id);

  const scope = await resolveAcademicScope({
    role_key,
    scope_type,
    fakultas_id: payload.fakultas_id || null,
    prodi_id: payload.prodi_id || null,
  });

  const existing = await LmsRoleScope.findOne({
    where: {
      user_id,
      role_key,
      scope_type,
      fakultas_id: scope.fakultas_id,
      prodi_id: scope.prodi_id,
      is_active: true,
    },
  });
  if (existing) throw new Error("Scope LMS aktif untuk user tersebut sudah ada.");

  return LmsRoleScope.create({
    user_id,
    role_key,
    scope_type,
    fakultas_id: scope.fakultas_id,
    prodi_id: scope.prodi_id,
    permissions: mergePermissions(role_key, payload.permissions),
    is_active: payload.is_active === undefined ? true : Boolean(payload.is_active),
    created_by: actorId,
    updated_by: actorId,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function listRoleScopes(options = {}) {
  const limit = normalizeLimit(options.limit);
  const page = normalizePage(options.page);
  const offset = (page - 1) * limit;
  const where = {};

  if (options.user_id) where.user_id = options.user_id;
  if (options.role_key) where.role_key = normalizeRoleKey(options.role_key);
  if (options.scope_type) where.scope_type = options.scope_type;
  if (options.is_active !== undefined) {
    where.is_active = options.is_active === true || options.is_active === "true";
  }

  const search = options.search ? String(options.search).trim() : "";
  if (search) {
    where[Op.or] = [
      { role_key: { [Op.iLike]: `%${search}%` } },
      { scope_type: { [Op.iLike]: `%${search}%` } },
      { fakultas_id: { [Op.iLike]: `%${search}%` } },
      { prodi_id: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const data = await LmsRoleScope.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit,
    offset,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["user_id", "role", "email", "npm", "nidn"],
        required: false,
      },
    ],
  });

  return {
    limit,
    page,
    total: data.count,
    total_page: Math.ceil(data.count / limit),
    rows: data.rows,
  };
}

async function getUserRoleScopes(userId) {
  if (!userId) return [];
  return LmsRoleScope.findAll({
    where: {
      user_id: userId,
      is_active: true,
    },
    order: [["role_key", "ASC"], ["fakultas_id", "ASC"], ["prodi_id", "ASC"]],
  });
}

async function updateRoleScope(id, payload = {}, actorId = null) {
  const scope = await LmsRoleScope.findByPk(id);
  if (!scope) throw new Error("Scope LMS tidak ditemukan.");

  const role_key = payload.role_key ? normalizeRoleKey(payload.role_key) : scope.role_key;
  const scope_type = payload.scope_type
    ? normalizeScopeType(role_key, payload.scope_type)
    : normalizeScopeType(role_key, scope.scope_type);

  const academicScope = await resolveAcademicScope({
    role_key,
    scope_type,
    fakultas_id: payload.fakultas_id !== undefined ? payload.fakultas_id : scope.fakultas_id,
    prodi_id: payload.prodi_id !== undefined ? payload.prodi_id : scope.prodi_id,
  });

  await scope.update({
    role_key,
    scope_type,
    fakultas_id: academicScope.fakultas_id,
    prodi_id: academicScope.prodi_id,
    permissions: payload.permissions
      ? mergePermissions(role_key, payload.permissions)
      : scope.permissions,
    is_active: payload.is_active === undefined ? scope.is_active : Boolean(payload.is_active),
    updated_by: actorId,
    updated_at: new Date(),
  });

  return scope;
}

async function deactivateRoleScope(id, actorId = null) {
  const scope = await LmsRoleScope.findByPk(id);
  if (!scope) throw new Error("Scope LMS tidak ditemukan.");
  await scope.update({
    is_active: false,
    updated_by: actorId,
    updated_at: new Date(),
  });
  return scope;
}

async function getClassAcademicScope(kelasKuliahId) {
  if (!kelasKuliahId) return null;
  const [rows] = await db.query(`
    SELECT
      cls.kelas_kuliah_id,
      cls.prodi_id,
      sp.kode_prodi,
      sp.nama_prodi,
      sp.fakultas_id,
      f.kode_fakultas,
      f.nama_fakultas
    FROM siak_sync_classes cls
    LEFT JOIN siak_sync_study_programs sp ON sp.prodi_id = cls.prodi_id
    LEFT JOIN siak_sync_faculties f ON f.fakultas_id = sp.fakultas_id
    WHERE cls.kelas_kuliah_id = :kelasKuliahId
    LIMIT 1
  `, {
    replacements: { kelasKuliahId },
  });
  return rows[0] || null;
}

async function userCanViewClassByScope(user, kelasKuliahId) {
  if (!user || !user.user_id) return { allowed: false, reason: "User tidak valid." };
  if (user.role === "Admin") {
    return { allowed: true, source: "global_admin", scope: null, class_scope: null };
  }

  const scopes = await getUserRoleScopes(user.user_id);
  if (!scopes.length) return { allowed: false, reason: "User tidak punya scope LMS." };

  const classScope = await getClassAcademicScope(kelasKuliahId);
  if (!classScope) {
    return {
      allowed: false,
      reason: "Scope akademik kelas belum tersedia di staging SIAK.",
    };
  }

  for (const scope of scopes) {
    if (scope.scope_type === "university") {
      return { allowed: true, source: "lms_role_scope", scope, class_scope: classScope };
    }
    if (scope.scope_type === "faculty" && scope.fakultas_id === classScope.fakultas_id) {
      return { allowed: true, source: "lms_role_scope", scope, class_scope: classScope };
    }
    if (scope.scope_type === "study_program" && scope.prodi_id === classScope.prodi_id) {
      return { allowed: true, source: "lms_role_scope", scope, class_scope: classScope };
    }
  }

  return {
    allowed: false,
    reason: "Scope LMS user tidak mencakup kelas ini.",
    class_scope: classScope,
  };
}

module.exports = {
  ROLE_SCOPE_MAP,
  createRoleScope,
  listRoleScopes,
  getUserRoleScopes,
  updateRoleScope,
  deactivateRoleScope,
  getClassAcademicScope,
  userCanViewClassByScope,
};
