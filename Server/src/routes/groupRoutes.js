const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  listGroups,
  createGroup,
  getGroupMembers,
  addGroupMember,
  sendGroupMessage,
  getGroupMessages,
} = require("../controllers/groupController");

const router = express.Router();
router.use(authMiddleware);

router.get("/", listGroups);
router.post("/", createGroup);
router.get("/:groupId/members", getGroupMembers);
router.post("/:groupId/members", addGroupMember);
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", sendGroupMessage);

module.exports = router;
