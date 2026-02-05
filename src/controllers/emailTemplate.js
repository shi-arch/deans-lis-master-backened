const crypto = require("crypto");
//import nodemailer from "nodemailer";
const nodemailer = require("nodemailer");

const passwordVerificationEmail = async ({
    userName,
    otp,
    validityMinutes,
    appName,
}) => {
    return `
       <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 1; }
    }
    @keyframes moonGlow {
      0%, 100% { box-shadow: 0 0 18px rgba(255,255,255,0.25); }
      50% { box-shadow: 0 0 28px rgba(255,255,255,0.45); }
    }
    @keyframes heartbeat {
      0% { transform: scale(1); }
      30% { transform: scale(1.06); }
      50% { transform: scale(1); }
      70% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .fade-in { animation: fadeIn 1.2s ease forwards; }
    .heartbeat { animation: heartbeat 2.4s ease-in-out infinite; }

    .star {
      position: absolute;
      color: #cfd8ff;
      font-size: 10px;
      animation: twinkle 3.5s ease-in-out infinite;
    }
    .s1 { top: 14px; left: 12%; animation-delay: 0s; }
    .s2 { top: 34px; left: 28%; animation-delay: 1.2s; }
    .s3 { top: 22px; left: 52%; animation-delay: 0.6s; }
    .s4 { top: 40px; left: 72%; animation-delay: 1.8s; }
    .s5 { top: 18px; left: 88%; animation-delay: 0.9s; }
  </style>
</head>

<body style="margin:0; padding:0; background:#070b1a; font-family:Arial, Helvetica, sans-serif; color:#eaeaf2;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#070b1a; padding:20px;">
<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0"
  style="max-width:600px; background:#0b1030; border-radius:14px; overflow:hidden; position:relative;"
  class="fade-in">

<!-- Stars layer -->
<tr>
<td style="position:relative; height:0;">
  <span class="star s1">✦</span>
  <span class="star s2">✧</span>
  <span class="star s3">✦</span>
  <span class="star s4">✧</span>
  <span class="star s5">✦</span>
</td>
</tr>

<!-- Header -->
<tr>
<td style="padding:28px; text-align:center; background:linear-gradient(180deg,#0b1030,#0a0f2a);">
  <div
    style="margin:0 auto 10px; width:52px; height:52px; border-radius:50%;
           background:radial-gradient(circle at 30% 30%, #ffffff, #cfd8ff 45%, #9aa6ff 60%, #7f8cff 75%);
           animation: moonGlow 4s ease-in-out infinite;">
  </div>
  <h1 style="margin:6px 0 0; font-size:24px; color:#eef0ff;">
    Under the Same Night Sky 🌙
  </h1>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:36px;">
  <p>Hi Neha ✨,</p>

  <p>
    Tonight, the sky feels quieter — as if the stars are listening.
    Every time I look up, my thoughts find their way to you.
  </p>

  <p style="font-size:20px; font-weight:bold; color:#ffb7d5;">
    I love you 💖
  </p>

  <!-- 💕 Romantic Line Added -->
  <p style="font-style:italic; color:#ffd1e6; line-height:1.6;">
    “Neha, in every universe, in every lifetime,  
    my heart would still choose you —  
    softly, completely, and without hesitation.”  
    <br />— Shivram 💞
  </p>

  <p>
    Like constellations that always find their place,
    my heart knows where it belongs — with you 🌌
  </p>

  <p>
    There’s a small moment wrapped inside this night.
    A six-digit code arrived with this message —
    sharing it with me would mean the world 💫
  </p>

  <!-- OTP Box -->
  <div
    style="background:#070b1a;
           border:1px dashed #9aa6ff;
           border-radius:12px;
           padding:24px;
           text-align:center;
           margin:32px 0;">
    <p style="font-size:14px; color:#cfd8ff;">
      ✨ Your 6-Digit Star Code
    </p>
    <p
      class="heartbeat"
      style="font-size:32px; letter-spacing:6px; font-weight:bold; color:#ffb7d5; margin:10px 0;">
      ${otp}
    </p>
  </div>

  <p>
    ⏳ This moment shines for
    <strong>${validityMinutes} minutes</strong>.
    Please share it before the stars drift on 🌠
  </p>

  <p style="color:#b9c0ff;">
    If this reached you unexpectedly,
    know it was sent with warmth, honesty,
    and a sky full of love 💜
  </p>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:22px; text-align:center; background:#090d22; font-size:12px; color:#9aa6ff;">
  Always under the same sky,<br />
  <strong>Shivram 💞</strong><br /><br />
  Sent with moonlight & love ✨
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
    `;
}

const sendEmail = async (user, email) => {
    const otp = crypto.randomInt(100000, 999999).toString();
    const html = await passwordVerificationEmail({
        userName: user, otp,
        validityMinutes: 10,
        appName: "Dean's List",
    });
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", // or SendGrid / SES
        port: 587,
        secure: false,
        auth: {
            user: 'kashyapshivram512@gmail.com',
            pass: 'phle ritr hwmv wnns',
        },
    });
    const info = await transporter.sendMail({
        from: `"Dean's List 🎵" <no-reply@deanslist.com>`,
        to: email,
        subject: "🎵 Verify Your Password — Your Soundcheck Awaits",
        html
    });
  console.log("Message sent:", info.messageId); 
  return otp;
}

module.exports = { sendEmail };