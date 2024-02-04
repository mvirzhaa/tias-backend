const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");

const sendEmail = async (subject, send_to, send_from, template, link) => {
  console.log(link);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const handlebarsOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("./views"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views"),
    extName: ".handlebars",
  };

  transporter.use("compile", hbs(handlebarsOptions));

  // options for sending email
  const options = {
    from: send_from,
    to: send_to,
    subject,
    template,
    context: {
      link,
    },
  };

  // send email
  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log("Email Sent!");
    }
  });
};

module.exports = sendEmail;
