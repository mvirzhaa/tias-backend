const { isSuperAdmin } = require("../../middleware/authMiddleware");
const { getUserRoleScopes } = require("../lms/roleScopeService");
const db = require("../../config");

/**
 * Master TA (TaPengajuan/TaTahapan) pakai prodi_id (siak_v2_program_studi UUID),
 * sama seperti LMS — jadi scoping-nya numpang ke LmsRoleScope yang sudah ada,
 * BUKAN bikin sistem scope baru lagi. Lihat juga middleware/departmentScope.js
 * (pola yang sama, tapi utk Tugas Akhir/Presensi legacy yang masih department_code).
 *
 * Return null  = unrestricted (superadmin, atau admin dgn scope "university").
 * Return array = daftar prodi_id yang boleh diakses; WAJIB dipakai filter.
 * Res 403 & throw kalau admin non-superadmin sama sekali tidak punya scope apapun.
 */
async function resolveProdiScope(req, res) {
  if (isSuperAdmin(req.user)) return null;

  if (!req.user || !req.user.user_id) {
    res.status(403);
    throw new Error("Tidak diizinkan.");
  }

  const scopes = await getUserRoleScopes(req.user.user_id);
  if (!scopes.length) {
    res.status(403);
    throw new Error("Akun ini belum punya scope prodi/fakultas utk Master TA.");
  }

  if (scopes.some((s) => s.scope_type === "university")) return null;

  const prodiIds = new Set(
    scopes.filter((s) => s.scope_type === "study_program" && s.prodi_id).map((s) => s.prodi_id)
  );

  const facultyIds = scopes
    .filter((s) => s.scope_type === "faculty" && s.fakultas_id)
    .map((s) => s.fakultas_id);
  if (facultyIds.length) {
    const [rows] = await db.query(
      `SELECT "siakProgramStudiId" FROM siak_v2_program_studi WHERE "siakFakultasId" IN (:facultyIds)`,
      { replacements: { facultyIds } }
    );
    rows.forEach((r) => prodiIds.add(r.siakProgramStudiId));
  }

  if (!prodiIds.size) {
    res.status(403);
    throw new Error("Akun ini belum punya scope prodi/fakultas utk Master TA.");
  }

  return Array.from(prodiIds);
}

/** scopeProdiIds dari resolveProdiScope() di atas — null = unrestricted. */
function isProdiAllowed(scopeProdiIds, prodiId) {
  return scopeProdiIds === null || scopeProdiIds.includes(prodiId);
}

module.exports = { resolveProdiScope, isProdiAllowed };
