const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel/signupModel')
require("dotenv").config();
const jwt = require('jsonwebtoken');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {

    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      proxy: true,
      userProfileURL:process.env.USER_PROFILE_URL ,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          // Create JWT token for existing user
          const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
          
          if (req.session) {
            req.session.token = token;
          }
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            firstname: profile.name.givenName,
            lastname: profile.name.familyName,
            picture: profile.photos[0].value,
            status: 'active'
          });
          
          // Create JWT token for new user
          const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
          


           

          
          if (req.session) {
            req.session.token = token;
          }
        }

        return done(null, user);
      } catch (err) {
     
        return done(err, null);
      }
    }
  )
);