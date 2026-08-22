const express = require("express");

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const avatarUpload = require("../middleware/avatarUpload");

const {
  getUsers,
  offlineUser,
  getProfile,
  updateProfile,
} = require("../controllers/UserController");

router.get("/", authMiddleware, getUsers);

router.put("/offline/:id", authMiddleware, offlineUser);
router.get("/me", authMiddleware, getProfile);
router.put("/me", authMiddleware, avatarUpload.single("avatar"), updateProfile);

module.exports = router;