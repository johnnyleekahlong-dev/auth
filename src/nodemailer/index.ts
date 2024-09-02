import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import hbs from 'nodemailer-express-handlebars';

dotenv.config();

const transporter = nodemailer.createTransport({
  port: 465,
  host: 'smtp.gmail.com',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  secure: true,
});

// const transporter = nodemailer.createTransport({
//   service: process.env.MAIL_HOST,
//   auth: {
//     user: process.env.MAIL_USERNAME,
//     pass: process.env.MAIL_PASSWORD,
//   },
// });

// handlebars plugin in nodemailer
// const hbsOptions = {
//   viewEngine: {
//     partialsDir: 'src/nodemailer/views',
//     layoutsDir: 'src/nodemailer/views',
//     defaultLayout: 'base',
//   },
//   viewPath: 'src/nodemailer/views',
// };

// transporter.use('compile', hbs(hbsOptions));

export const sendEmail = (
  to: string,
  subject: string,
  // template: string,
  // context: any
  textContent: string,
  htmlContent: string
) => {
  const mailOptions = {
    from: `"Authentication System" <${process.env.MAIL_USERNAME}>`,
    to,
    subject,
    // template,
    // context,
    text: textContent,
    html: htmlContent,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log('Nodemailer Error: ', err);
        reject(err);
      } else {
        console.log('Email sent successfully!');
        resolve('Email sent successfully');
      }
    });
  });
};
