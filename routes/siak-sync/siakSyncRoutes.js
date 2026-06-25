const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const SyncController = require("../../controllers/siak-sync/syncController");

const router = express.Router();

router.get("/resources", protected, adminOnly, SyncController.listResources);
router.get("/validation", protected, adminOnly, SyncController.validate);
router.get("/course-mappings", protected, adminOnly, SyncController.listCourseMappings);
router.post("/course-mappings/auto", protected, adminOnly, SyncController.autoMapCourses);
router.post("/course-mappings", protected, adminOnly, SyncController.createCourseMapping);
router.patch("/course-mappings/:id", protected, adminOnly, SyncController.updateCourseMapping);
router.delete("/course-mappings/:id", protected, adminOnly, SyncController.deleteCourseMapping);
router.post("/sync", protected, adminOnly, SyncController.syncAll);
router.post("/sync/:resource", protected, adminOnly, SyncController.syncOne);

// ── Task 6: User Mapping — Admin-only ────────────────────────────────────────
// PENTING: /user-mappings/unmatched harus SEBELUM /user-mappings/:id
// agar 'unmatched' tidak ditangkap sebagai :id.
router.get("/user-mappings", protected, adminOnly, SyncController.listUserMappings);
router.get("/user-mappings/unmatched", protected, adminOnly, SyncController.listUnmatchedUsers);
router.post("/user-mappings", protected, adminOnly, SyncController.createUserMapping);
router.patch("/user-mappings/:id", protected, adminOnly, SyncController.updateUserMapping);

module.exports = router;
