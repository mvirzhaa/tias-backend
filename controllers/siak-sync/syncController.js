const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { RESOURCE_ORDER, syncAllResources, syncResource } = require("../../lib/siak-sync/syncService");
const { validateSiakSync } = require("../../lib/siak-sync/validationService");
const {
  listCourseMappings,
  autoMapCoursesByCode,
  createCourseMapping,
  updateCourseMapping,
  deleteCourseMapping,
} = require("../../lib/siak-sync/courseMappingService");
const {
  listUserMappings,
  listUnmatchedUsers,
  createUserMapping,
  updateUserMapping,
} = require("../../lib/siak-sync/userMappingService");

exports.listResources = asyncHandler(async (req, res) => {
  return response(res, true, "Success", {
    resources: RESOURCE_ORDER,
    default_mode: process.env.SIAK_SYNC_MODE || "mock",
    default_semester: process.env.SIAK_SYNC_SEMESTER || "20241",
  });
});

exports.syncOne = asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    const result = await syncResource(req.params.resource, {
      mode: body.mode || req.query.mode,
      semester: body.semester || req.query.semester,
      perPage: body.perPage || req.query.perPage,
    });
    return response(res, true, "Sinkronisasi resource SIAK berhasil.", result);
  } catch (error) {
    return response(res, false, `Sinkronisasi gagal: ${error.message}`, null, 502);
  }
});

exports.syncAll = asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    const result = await syncAllResources({
      mode: body.mode || req.query.mode,
      semester: body.semester || req.query.semester,
      perPage: body.perPage || req.query.perPage,
    });
    return response(res, true, "Sinkronisasi semua resource SIAK berhasil.", result);
  } catch (error) {
    return response(res, false, `Sinkronisasi gagal: ${error.message}`, null, 502);
  }
});

exports.validate = asyncHandler(async (req, res) => {
  try {
    const result = await validateSiakSync({
      limit: req.query.limit,
    });

    const message = result.valid
      ? "Validasi hasil sync SIAK tidak menemukan error."
      : "Validasi hasil sync SIAK menemukan error.";

    return response(res, true, message, result);
  } catch (error) {
    return response(res, false, `Validasi gagal: ${error.message}`, null, 502);
  }
});

exports.listCourseMappings = asyncHandler(async (req, res) => {
  try {
    const result = await listCourseMappings({
      limit: req.query.limit,
      page: req.query.page,
      status: req.query.status,
      search: req.query.search,
    });
    return response(res, true, "Success", result);
  } catch (error) {
    return response(res, false, `Gagal membaca mapping mata kuliah: ${error.message}`, null, 502);
  }
});

exports.autoMapCourses = asyncHandler(async (req, res) => {
  try {
    const result = await autoMapCoursesByCode();
    return response(res, true, "Auto mapping mata kuliah selesai.", result);
  } catch (error) {
    return response(res, false, `Auto mapping gagal: ${error.message}`, null, 502);
  }
});

exports.createCourseMapping = asyncHandler(async (req, res) => {
  try {
    const result = await createCourseMapping({
      ...req.body,
      verified_by: req.user && req.user.user_id,
    });
    return response(res, true, "Mapping mata kuliah berhasil dibuat.", result, 201);
  } catch (error) {
    return response(res, false, `Gagal membuat mapping: ${error.message}`, null, 422);
  }
});

exports.updateCourseMapping = asyncHandler(async (req, res) => {
  try {
    const result = await updateCourseMapping(req.params.id, {
      ...req.body,
      verified_by: req.user && req.user.user_id,
    });
    return response(res, true, "Mapping mata kuliah berhasil diperbarui.", result);
  } catch (error) {
    return response(res, false, `Gagal memperbarui mapping: ${error.message}`, null, 422);
  }
});

exports.deleteCourseMapping = asyncHandler(async (req, res) => {
  try {
    const result = await deleteCourseMapping(req.params.id);
    return response(res, true, "Mapping mata kuliah berhasil dihapus.", result);
  } catch (error) {
    return response(res, false, `Gagal menghapus mapping: ${error.message}`, null, 422);
  }
});

// ── Task 6: User Mapping (Admin-only) ────────────────────────────────────────

exports.listUserMappings = asyncHandler(async (req, res) => {
  try {
    const result = await listUserMappings({
      limit: req.query.limit,
      page: req.query.page,
      status: req.query.status,
      role: req.query.role,
      identifier_type: req.query.identifier_type,
    });
    return response(res, true, "Success", result);
  } catch (error) {
    return response(res, false, `Gagal membaca user mappings: ${error.message}`, null, 422);
  }
});

exports.listUnmatchedUsers = asyncHandler(async (req, res) => {
  try {
    const result = await listUnmatchedUsers();
    return response(res, true, "Success", result);
  } catch (error) {
    return response(res, false, `Gagal membaca unmatched users: ${error.message}`, null, 502);
  }
});

exports.createUserMapping = asyncHandler(async (req, res) => {
  try {
    const result = await createUserMapping(
      req.body,
      req.user && req.user.user_id
    );
    return response(res, true, "Mapping user berhasil dibuat.", result, 201);
  } catch (error) {
    return response(res, false, `Gagal membuat user mapping: ${error.message}`, null, 422);
  }
});

exports.updateUserMapping = asyncHandler(async (req, res) => {
  try {
    const result = await updateUserMapping(
      req.params.id,
      req.body,
      req.user && req.user.user_id
    );
    return response(res, true, "User mapping berhasil diperbarui.", result);
  } catch (error) {
    return response(res, false, `Gagal memperbarui user mapping: ${error.message}`, null, 422);
  }
});
