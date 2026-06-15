const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const {
  createRoleScope,
  listRoleScopes,
  getUserRoleScopes,
  updateRoleScope,
  deactivateRoleScope,
} = require("../../lib/lms/roleScopeService");

const actorId = (req) => (req.user && req.user.user_id ? req.user.user_id : null);

exports.listRoleScopes = asyncHandler(async (req, res) => {
  try {
    const result = await listRoleScopes({
      limit: req.query.limit,
      page: req.query.page,
      user_id: req.query.user_id,
      role_key: req.query.role_key,
      scope_type: req.query.scope_type,
      is_active: req.query.is_active,
      search: req.query.search,
    });
    return response(res, true, "Success", result);
  } catch (error) {
    return response(res, false, `Gagal membaca scope LMS: ${error.message}`, null, 422);
  }
});

exports.getMyRoleScopes = asyncHandler(async (req, res) => {
  try {
    const result = await getUserRoleScopes(req.user && req.user.user_id);
    return response(res, true, "Success", result);
  } catch (error) {
    return response(res, false, `Gagal membaca scope LMS user: ${error.message}`, null, 422);
  }
});

exports.createRoleScope = asyncHandler(async (req, res) => {
  try {
    const result = await createRoleScope(req.body || {}, actorId(req));
    return response(res, true, "Scope LMS berhasil dibuat.", result, 201);
  } catch (error) {
    return response(res, false, `Gagal membuat scope LMS: ${error.message}`, null, 422);
  }
});

exports.updateRoleScope = asyncHandler(async (req, res) => {
  try {
    const result = await updateRoleScope(req.params.id, req.body || {}, actorId(req));
    return response(res, true, "Scope LMS berhasil diperbarui.", result);
  } catch (error) {
    return response(res, false, `Gagal memperbarui scope LMS: ${error.message}`, null, 422);
  }
});

exports.deactivateRoleScope = asyncHandler(async (req, res) => {
  try {
    const result = await deactivateRoleScope(req.params.id, actorId(req));
    return response(res, true, "Scope LMS berhasil dinonaktifkan.", result);
  } catch (error) {
    return response(res, false, `Gagal menonaktifkan scope LMS: ${error.message}`, null, 422);
  }
});
