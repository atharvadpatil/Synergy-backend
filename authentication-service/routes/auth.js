const express = require("express");
const { googleLogin, googleCallback, generateJWT, refreshAccessToken, logout } = require("../controllers/authController");

const router = express.Router();

// Google OAuth routes
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback, generateJWT);

// Refresh Token Route
router.post("/refresh", refreshAccessToken);

// Logout Route
router.post("/logout", logout);

module.exports = router;
