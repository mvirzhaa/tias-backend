const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  lecturerOwnsClassForAttendance,
  lecturerOwnsSession,
  studentCanSubmitAttendance,
} = require("../../middleware/lms/attendanceAccess");
const { attendanceUpload } = require("../../middleware/lms/attendanceUpload");
const {
  openSession,
  closeSession,
  resolveToken,
  submitAttendance,
  myAttendanceHistory,
  rekap,
  getCurrentSession,
  getSessionRecords,
} = require("../../controllers/lms/attendanceController");

const router = express.Router();

router.post("/sessions", protected, lecturerOwnsClassForAttendance, openSession);
router.get("/sessions/current", protected, getCurrentSession);
router.patch("/sessions/:id/close", protected, lecturerOwnsSession, closeSession);
router.get("/sessions/resolve", protected, resolveToken);
router.get("/sessions/:id/records", protected, lecturerOwnsSession, getSessionRecords);
router.post("/submit", protected, attendanceUpload, studentCanSubmitAttendance, submitAttendance);
router.get("/me", protected, myAttendanceHistory);
router.get("/rekap", protected, adminOnly, rekap);

module.exports = router;
