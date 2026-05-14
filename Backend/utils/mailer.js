/* SMTP helper — wraps nodemailer with our env config.
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   SMTP_SECURE — "true" for port 465 (SSL), "false" for 587 (STARTTLS)
 *
 * The Gmail App Password may be pasted with spaces; we strip them so the
 * transport doesn't reject the credentials.
 */
const nodemailer = require('nodemailer');

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env'
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS.replace(/\s+/g, ''),
    },
  });

  return cachedTransporter;
};

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return transporter.sendMail({ from, to, subject, html, text });
};

const buildOtpHtml = (otp, recipientName) => `
  <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="color: #222; margin: 0 0 8px;">Verify your email</h2>
      <p style="color: #555; line-height: 1.5; margin: 0 0 24px;">
        ${recipientName ? `Hi ${recipientName},` : 'Hi,'} use the code below to confirm your email address. It expires in 5 minutes.
      </p>
      <div style="text-align: center; padding: 18px 0; background: #fff8e1; border-radius: 10px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #222;">
        ${otp}
      </div>
      <p style="color: #888; font-size: 13px; margin: 24px 0 0;">
        If you didn't try to sign up, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 12px;" />
      <p style="color: #aaa; font-size: 12px; margin: 0;">ApnaBnB · Real Estate Marketplace</p>
    </div>
  </div>
`;

const sendOtpEmail = async (to, otp, recipientName = '') =>
  sendMail({
    to,
    subject: 'Your ApnaBnB verification code',
    text: `Your ApnaBnB verification code is ${otp}. It expires in 5 minutes.`,
    html: buildOtpHtml(otp, recipientName),
  });

const buildResetHtml = (resetUrl, recipientName) => `
  <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="color: #222; margin: 0 0 8px;">Reset your password</h2>
      <p style="color: #555; line-height: 1.5; margin: 0 0 24px;">
        ${recipientName ? `Hi ${recipientName},` : 'Hi,'} click the button below to choose a new password. The link expires in 15 minutes.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}"
           style="display: inline-block; background: #ff385c; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
          Reset password
        </a>
      </div>
      <p style="color: #555; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="word-break: break-all; font-size: 12px; color: #1976d2; margin: 0 0 24px;">
        ${resetUrl}
      </p>
      <p style="color: #888; font-size: 13px; margin: 24px 0 0;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 12px;" />
      <p style="color: #aaa; font-size: 12px; margin: 0;">ApnaBnB · Real Estate Marketplace</p>
    </div>
  </div>
`;

const sendResetEmail = async (to, resetUrl, recipientName = '') =>
  sendMail({
    to,
    subject: 'Reset your ApnaBnB password',
    text: `Reset your password using this link (valid 15 minutes): ${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: buildResetHtml(resetUrl, recipientName),
  });

module.exports = { sendMail, sendOtpEmail, sendResetEmail };
