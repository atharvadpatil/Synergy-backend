const express = require("express");
const { googleLogin, googleCallback, generateJWT } = require("../controllers/authController");

const router = express.Router();

// Google OAuth routes
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback, generateJWT);

module.exports = router;
