const express = require("express");
const { googleLogin, googleCallback, generateJWT, refreshAccessToken } = require("../controllers/authController");

const router = express.Router();

// Google OAuth routes
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback, generateJWT);

// Refresh Token Route
router.post("/refresh", refreshAccessToken);

module.exports = router;
