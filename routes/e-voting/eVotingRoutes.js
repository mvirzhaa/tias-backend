const express = require("express");
const { protected, adminOnly } = require("../../middleware/authMiddleware");
const {
  getActiveQuestion,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  detailQuestion,
  detailForEditQuestion,
  deleteGroupQuestion,
} = require("../../controllers/e-voting/questionController");
const {
  getAnswer,
  createAnswer,
  updateAnswer,
  deleteAnswer,
} = require("../../controllers/e-voting/answerController");
const {
  createResult,
  cekSum,
} = require("../../controllers/e-voting/resultsController");
const {
  getGroupVoting,
  createGroup,
  deleteGroup,
  detailGroup,
  editGroup,
  detailToCreateUserGroup,
  getGroupUsers,
  userGroupRegister,
  deleteUserFromGroup,
  getGroupUsersAgain,
  getAllGroup,
} = require("../../controllers/e-voting/groupController");
const {
  getGroupUserMeet,
} = require("../../controllers/jadwal-rapat/jadwalRapatController");

const router = express.Router();

router.get("/question", protected, getActiveQuestion);
router.get("/question/:id", protected, detailQuestion);
router.get("/question-detail/:id", protected, detailForEditQuestion);
router.get("/question-all", protected, getQuestion);
router.post("/question", protected, adminOnly, createQuestion);
router.patch("/question/:id", protected, adminOnly, updateQuestion);
router.delete("/question/:id", protected, adminOnly, deleteQuestion);

router.get("/answer/all", protected, getAnswer);
router.post("/answer", protected, adminOnly, createAnswer);
router.put("/answer/:id", protected, adminOnly, updateAnswer);
router.delete("/answer/:id", protected, adminOnly, deleteAnswer);

router.post("/result", protected, createResult);

router.get("/cek-sum", cekSum);

router.get("/group-voting", protected, getGroupVoting);
router.get("/group-voting/:id", protected, detailGroup);
router.get("/group-voting/detail-to-create/:id", detailToCreateUserGroup);
router.post("/group-voting", protected, createGroup);
// router.delete("/group-voting/:id", protected, deleteGroup);
router.delete("/group-voting/:id", protected, deleteGroupQuestion);

router.put("/group-voting/:id", protected, editGroup);

router.get("/group-users", protected, getGroupUsers);
router.get("/group-users-all", getGroupUsersAgain);
router.post("/group-users", protected, userGroupRegister);
router.put("/group-users/:user_id", deleteUserFromGroup);

router.get("/group-all", protected, getAllGroup);
router.get("/group-meet", getGroupUserMeet);

module.exports = router;
