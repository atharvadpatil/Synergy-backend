const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
dotenv.config();

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

exports.generateJWT = (req, res) => {
  try{
    const user = req.user;
  
    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  
    res.json({ token, user });
  } catch (err) {
    console.error('JWT Error:', err);
    throw new Error('Error generating token');
  }
};
