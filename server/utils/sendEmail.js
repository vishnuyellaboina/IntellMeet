const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendVerificationEmail = async (email, otp) => {
  try {
    console.log("Starting SendGrid email...");

    const message = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Your IntellMeet Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>IntellMeet Email Verification</h2>
          <p>Your verification code is:</p>
          <h1>${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    };

    await sgMail.send(message);

    console.log("Verification email sent successfully.");
  } catch (error) {
    console.error(
      "SendGrid email error:",
      error.response?.body || error.message
    );
    throw error;
  }
};

module.exports = sendVerificationEmail;