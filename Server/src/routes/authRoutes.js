const express = require("express");
const { authLimiter } = require("../middleware/rateLimit");
 

const router = express.Router();

const {
  register,
  login,
} = require("../controllers/authController");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

module.exports = router;