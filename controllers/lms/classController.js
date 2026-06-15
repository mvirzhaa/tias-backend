const asyncHandler = require("express-async-handler");
const { response } = require("../../lib/response");
const { listLmsClasses } = require("../../lib/lms/siakStagingBridgeService");

exports.listClasses = asyncHandler(async (req, res) => {
  try {
    const result = await listLmsClasses({
      user: req.user,
      limit: req.query.limit,
      page: req.query.page,
      semester: req.query.semester,
      search: req.query.search,
    });

    return response(res, true, "Success", result);
  } catch (error) {
    return response(res, false, `Gagal membaca kelas LMS: ${error.message}`, null, 502);
  }
});
