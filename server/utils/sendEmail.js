const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendVerificationEmail = async (email, otp) => {
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

        <p>If you did not create an IntellMeet account, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = sendVerificationEmail;