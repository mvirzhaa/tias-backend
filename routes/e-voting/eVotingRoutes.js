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
} = require("../../controllers/e-voting/groupController");

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
router.delete("/group-voting/:id", protected, deleteGroup);
router.put("/group-voting/:id", protected, editGroup);

router.get("/group-users", protected, getGroupUsers);
router.get("/group-users-all", getGroupUsersAgain);
router.post("/group-users", protected, userGroupRegister);
router.put("/group-users/:user_id", deleteUserFromGroup);

module.exports = router;
