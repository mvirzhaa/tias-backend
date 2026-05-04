require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const errorHandler = require("./helper/errorHandler");
const session = require("express-session");
const passport = require("./utils/passport");
const router = require("./routes/routes");
// const { whatsapp } = require("./utils/whatsapp");
// const {
//   cleanupExpiredTokens,
//   cleanupExpiredTokensUsers,
// } = require("./utils/cronjobs");
// const moment = require("moment-timezone");
// const cron = require("node-cron");
// const { deleteExpiredToken } = require("./utils/deleteToken");

const app = express();

// whatsapp.initialize();
// cleanupExpiredTokens();
// cleanupExpiredTokensUsers();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(router);

// CRON JOB
// const runAtSpecificTime = (task) => {
//   return () => {
//     const now = moment().tz("Asia/Jakarta");
//     if (now.date() % 5 === 3 && now.hours() === 0 && now.minutes() === 0) {
//       task();
//     }
//   };
// };
// cron.schedule("* * * * *", runAtSpecificTime(deleteExpiredToken));

// error handler
app.use(errorHandler);

const startServer = () => {
  const PORT = process.env.PORT || 5000;
  try {
    app.listen(PORT, () => {
      console.log(`Server Running On Port: ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

startServer();
