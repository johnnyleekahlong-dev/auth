import nodemailer from "nodemailer";
import dotenv from "dotenv";
import hbs from "nodemailer-express-handlebars";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.MAIL_HOST,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

// handlebars plugin in nodemailer
const hbsOptions = {
  viewEngine: {
    partialsDir: "src/nodemailer/views",
    layoutsDir: "src/nodemailer/views",
    defaultLayout: "base",
  },
  viewPath: "src/nodemailer/views",
};

transporter.use("compile", hbs(hbsOptions));

export const sendEmail = (
  to: string,
  subject: string,
  template: string,
  context: any
) => {
  const mailOptions = {
    from: `"Authentication System" <${process.env.MAIL_USERNAME}>`,
    to,
    subject,
    template,
    context,
  };

  transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log("Nodemailer Error: ", err);
    } else {
      console.log("Email sent successfully!");
    }
  });
};
