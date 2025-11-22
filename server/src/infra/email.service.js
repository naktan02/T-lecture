const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationCode = async (toEmail, code) => {
  const mailOptions = {
    from: `"T-LECTURE Auth" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '[T-LECTURE] 이메일 인증번호 안내',
    html: `
      <div style="padding: 20px; border: 1px solid #ddd; max-width: 400px;">
        <h3>이메일 인증</h3>
        <p>안녕하세요, T-LECTURE 입니다.</p>
        <p>아래의 인증번호 6자리를 입력하여 인증을 완료해주세요.</p>
        <h2 style="color: #007bff; letter-spacing: 2px;">${code}</h2>
        <p style="font-size: 12px; color: gray;">* 이 코드는 3분간 유효합니다.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};