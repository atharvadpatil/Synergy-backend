const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
dotenv.config();

const generateAccessToken = (user) => {
  return jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
  );
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
          });
        }

        done(null, user);
      } catch (err) {
        console.error("Error saving user to database:", err);
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

exports.googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = passport.authenticate("google", {
  failureRedirect: "/auth/google",
  session: false,
});

exports.generateJWT = async (req, res) => {
  try{
    const user = req.user;
  
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const {name, email, avatar} = user;
    const sendUser = {name, email, avatar};

    const encodedUser = encodeURIComponent(JSON.stringify(sendUser));
    return res.redirect(`${process.env.FRONTEND_URL}/?token=${accessToken}&user=${encodedUser}`);
  
  } catch (err) {
    console.error('JWT Error:', err);
    throw new Error('Error generating token');
  }
};

exports.refreshAccessToken = async (req, res) => {
  try {
      const refreshToken = req.cookies.refreshToken; // Get refresh token from cookies

      if (!refreshToken) {
          return res.status(401).json({ message: "Refresh token missing" });
      }

      // Verify Refresh Token
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decodedToken) => {
          if (err) {
              return res.status(403).json({ message: "Invalid refresh token" });
          }

          // Find user in DB
          const user = await User.findById(decodedToken.id);
          if (!user || user.refreshToken !== refreshToken) {
              return res.status(403).json({ message: "Invalid refresh token" });
          }

          // Generate new access token
          const newAccessToken = generateAccessToken(user);
          res.json({ accessToken: newAccessToken });
      });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
};

exports.logout = async (req, res) => {
  try {
      res.clearCookie("refreshToken"); // Clear refresh token from cookies
      res.json({ message: "Logged out successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
};