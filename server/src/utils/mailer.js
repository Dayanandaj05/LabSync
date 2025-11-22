const nodemailer = require('nodemailer');

let testAccount = null;

async function getTransporter() {
  // 1. Check if REAL credentials exist in .env and are not the default placeholder
  // We check if SMTP_HOST is defined and NOT 'smtp.example.com'
  const hasRealConfig = process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.example.com';

  if (hasRealConfig) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // 2. Fallback: Generate a fake Ethereal account (For Testing)
  // This prevents the "ENOTFOUND" error if you haven't set up real email yet.
  if (!testAccount) {
    console.log('[MAIL] 🪄 Generating test SMTP account (Ethereal)...');
    try {
        testAccount = await nodemailer.createTestAccount();
    } catch (err) {
        console.error('[MAIL] Failed to create test account:', err.message);
        return null;
    }
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

async function sendMail(to, subject, text) {
  try {
    const transporter = await getTransporter();
    
    if (!transporter) {
        console.log('[MAIL] ⚠️ Mailer skipped (no transporter available)');
        return;
    }

    const info = await transporter.sendMail({
      from: '"LabSync System" <no-reply@labsync.local>',
      to,
      subject,
      text
    });

    console.log(`[MAIL] 📨 Sent to ${to}: ${subject}`);
    
    // If we are using the Test Account, print the Preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[MAIL] 🔗 Preview URL: ${previewUrl}`);
    }

    return info;
  } catch (err) {
    console.error('[MAIL] ❌ Error sending email:', err.message);
    // We catch the error here so the Server doesn't crash
  }
}

module.exports = { sendMail };