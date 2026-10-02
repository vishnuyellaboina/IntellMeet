const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendVerificationEmail = async (email, otp) => {
  try {
    console.log("Starting SendGrid email...");
    console.log(
      "SENDGRID_API_KEY configured:",
      !!process.env.SENDGRID_API_KEY
    );
    console.log(
      "SENDGRID_FROM_EMAIL configured:",
      !!process.env.SENDGRID_FROM_EMAIL
    );

    const message = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Your IntellMeet Verification Code",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: auto;
        ">
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