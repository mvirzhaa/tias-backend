const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DB = require("../database");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const user = await DB.query("SELECT * FROM tb_users WHERE email = $1", [
          email,
        ]);

        if (!user.rows.length) {
          return done(null, false, {
            message: "Invalid Email.",
          });
        }

        return done(null, user.rows[0]);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      id,
    ]);
    done(null, user.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
