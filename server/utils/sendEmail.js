const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  family: 4,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },

  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

const sendVerificationEmail = async (email, otp) => {
  try {
    console.log("Starting email send...");
    console.log("EMAIL_USER configured:", !!process.env.EMAIL_USER);
    console.log(
      "EMAIL_PASSWORD configured:",
      !!process.env.EMAIL_PASSWORD
    );

    await transporter.verify();

    console.log("SMTP connection verified.");

    await transporter.sendMail({
      from: `"IntellMeet" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your IntellMeet Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
          <h2>Verify your IntellMeet account</h2>
          <p>Your verification code is:</p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 20px;
            text-align: center;
            background: #f1f5f9;
            border-radius: 10px;
          ">
            ${otp}
          </div>

          <p>This code will expire in 10 minutes.</p>

          <p>
            If you did not create an IntellMeet account,
            you can ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Verification email sent successfully.");
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

module.exports = sendVerificationEmail;