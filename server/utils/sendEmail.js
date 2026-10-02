const nodemailer = require("nodemailer");

const sendVerificationEmail = async (email, otp) => {
  try {
    console.log("Starting Gmail email...");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your IntellMeet Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>IntellMeet Email Verification</h2>
          <p>Your verification code is:</p>
          <h1>${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

    console.log("Verification email sent successfully.");
  } catch (error) {
    console.error("Nodemailer email error:", error);
    throw error;
  }
};

module.exports = sendVerificationEmail;