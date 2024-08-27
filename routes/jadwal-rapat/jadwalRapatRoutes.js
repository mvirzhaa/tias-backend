const express = require("express");
const { protected } = require("../../middleware/authMiddleware");
const {
  storeMeeting,
} = require("../../controllers/jadwal-rapat/jadwalRapatController");
const {
  getMeeting,
  meetingStore,
  getMeetingInvite,
  meetingInviteStore,
  petaSebaran,
  getMeetingByUser,
} = require("../../controllers/jadwal-rapat/meetingController");
const {
  getAbsensiMeeting,
  absensiMeetStore,
  showQr,
  scanQr,
} = require("../../controllers/jadwal-rapat/absensiMeetController");

const router = express.Router();

// Custom
router.post("/store", storeMeeting);
// End Custom

// Absensi
router.get("/meeting", getMeeting);
router.get("/peta-sebaran", protected, petaSebaran);
router.post("/meeting/store", protected, meetingStore);
router.get("/meeting-invite", protected, getMeetingInvite);
router.get("/user-meeting", protected, getMeetingByUser);
router.post("/meeting-invite/store", protected, meetingInviteStore);

// Absensi Meet
router.get("/absensi", getAbsensiMeeting);
router.post("/absensi/store", absensiMeetStore);
router.get("/absensi/show-qr", showQr);
router.get("/absensi/scan-qr", scanQr);

module.exports = router;
