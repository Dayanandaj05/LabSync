// src/utils/mailer.js
const nodemailer = require('nodemailer');

async function sendMail(to, subject, text) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'labsync@example.com',
      to,
      subject,
      text
    });
    console.log('[MAIL] Sent:', info.messageId || '(no messageId)'); 
    return info;
  } catch (err) {
    console.error('[MAIL] send error:', err.message);
    throw err;
  }
}

module.exports = { sendMail };
