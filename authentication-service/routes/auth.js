const express = require("express");
const { googleLogin, googleCallback, generateJWT, refreshAccessToken, logout } = require("../controllers/authController");

const validateToken = require("../middlewares/validateToken");

const router = express.Router();

// Google OAuth routes
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback, generateJWT);

// Refresh Token Route
router.post("/refresh", refreshAccessToken);

// Logout Route
router.post("/logout", logout);

//protected route for testing
router.get('/protected', validateToken, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
});

module.exports = router;
