require("dotenv").config();
const moment = require("moment");
const formidable = require("./formidable");
const winston = require("winston");
const expressWinston = require("express-winston");
const compression = require("compression");
const ResponsTime = require("response-time");

export default {
  beforeRouter: (app) => {
    app.use(formidable);
    // app.use(
    //   helmet.contentSecurityPolicy({
    //     useDefaults: true,
    //     // "block-all-mixed-content": true,
    //     // "upgrade-insecure-requests": true,
    //     directives: {
    //       "img-src": ["'self'", "https: data:"],
    //       "script-src": ["'self'", "https://cdnjs.cloudflare.com/"],
    //       // "default-src": ["'self'", "https: data:"],
    //       // stylesrc: ["'self'", "https: data:"],
    //     },
    //   })
    // );
    // default-src 'none'; connect-src 'self'; script-src 'self'; img-src 'self'; style-src 'self'; frame-src 'self'

    app.use(ResponsTime());
    app.use((req, res, next) => {
      // res.header("Access-Control-Allow-Origin", "*");
      // res.setHeader(
      //   "Access-Control-Allow-Methods",
      //   "GET, POST, OPTIONS, PUT, PATCH, DELETE"
      // );
      // res.header(
      //   "Access-Control-Allow-Headers",
      //   "Origin, X-Requested-With, Content-Type, Accept"
      // );
      next();
    });
    // if (process.env.APP_ENABLE_CORS === "true") {
    // app.use(cors());
    // }
    if (process.env.APP_ENABLE_COMPRESSION === "true") {
      app.use(
        compression({
          filter: (req, res) => {
            if (req.headers["x-no-compression"]) {
              return false;
            }
            return compression.filter(req, res);
          },
          level: 8,
        })
      );
    }
    if (process.env.APP_ENABLE_RATE_LIMIT === "true") {
      app.use(
        require("express-rate-limit")({
          windowMs: Number(process.env.RATE_LIMIT_RESET) * 60 * 1000, // 1 minutes
          max: Number(process.env.RATE_LIMIT_VISIT_PER_RLR), // Limit each IP requests 100/min
          standardHeaders: true,
          legacyHeaders: false,
          message: (req, res) => {
            response(res, false, "Too Many Request", null, 429);
          },
        })
      );
    }

    if (process.env.APP_ENABLE_DEBUG_LOG === "true") {
      app.use(
        expressWinston.logger({
          transports: [
            new winston.transports.File({
              filename: `./logs/debug/${moment().format("YYYY_MM_DD")}.log`,
            }),
          ],
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.prettyPrint()
          ),
          meta: true,
          msg: "HTTP {{req.method}} {{req.url}}",
          expressFormat: true,
          colorize: false,
          ignoreRoute: function (req, res) {
            return false;
          },
        })
      );
    }
  },
  afterRouter: (app) => {
    console.log("after:  eng ing eng");
    if (process.env.APP_ENABLE_DEBUG_LOG === "true") {
      app.use(
        expressWinston.errorLogger({
          transports: [
            new winston.transports.File({
              filename: `./logs/error/${moment().format("YYYY_MM_DD")}.log`,
            }),
          ],
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.prettyPrint()
          ),
        })
      );
    }
    app.use((err, req, res, next) => {
      return response(
        res,
        false,
        "Internal Server Error",
        process.env.APP_NODE_ENV === "production" ? err.message : err.stack,
        500
      );
    });
    app.get("*", function (req, res) {
      return response(
        res,
        false,
        "Opppssss your request is not found!",
        null,
        404
      );
    });
    app.post("*", function (req, res) {
      return response(
        res,
        false,
        "Opppssss your request is not found!",
        null,
        404
      );
    });
  },
};
