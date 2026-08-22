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

const sendMail = async ({ to, subject, html, text, replyTo }) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  // replyTo is optional — the contact form uses it so replying reaches the
  // visitor rather than our own SMTP mailbox.
  return transporter.sendMail({ from, to, subject, html, text, ...(replyTo ? { replyTo } : {}) });
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

/* ─── Listing-created confirmation ─── */
const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(Number(price))) return '—';
  return `PKR ${Number(price).toLocaleString()}`;
};

const buildListingCreatedHtml = (recipientName, details, listingUrl) => {
  const {
    title = 'your property',
    propertyType = '',
    city = '',
    area = '',
    price,
    bedrooms,
    bathrooms,
    size,
    sizeUnit,
  } = details || {};
  const location = [area, city].filter(Boolean).join(', ') || '—';
  const rooms = [
    bedrooms ? `${bedrooms} Bed` : null,
    bathrooms ? `${bathrooms} Bath` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const sizeText = size ? `${size} ${sizeUnit || ''}`.trim() : '';

  return `
  <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="color: #00856f; margin: 0 0 8px;">Listing published 🎉</h2>
      <p style="color: #555; line-height: 1.5; margin: 0 0 24px;">
        ${recipientName ? `Hi ${recipientName},` : 'Hi,'} your property listing is now live on ApnaBnB. Here's a summary of what you posted:
      </p>

      <div style="background: #fafafa; border: 1px solid #ebebeb; border-radius: 10px; padding: 20px; margin: 0 0 24px;">
        <h3 style="color: #222; margin: 0 0 8px; font-size: 18px;">${title}</h3>
        <p style="color: #717171; margin: 0 0 16px; font-size: 14px;">
          ${propertyType ? `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} · ` : ''}${location}
        </p>
        <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #888;">Price</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">${formatPrice(price)}</td>
          </tr>
          ${
            sizeText
              ? `<tr><td style="padding: 4px 0; color: #888;">Size</td><td style="padding: 4px 0; text-align: right;">${sizeText}</td></tr>`
              : ''
          }
          ${
            rooms
              ? `<tr><td style="padding: 4px 0; color: #888;">Rooms</td><td style="padding: 4px 0; text-align: right;">${rooms}</td></tr>`
              : ''
          }
        </table>
      </div>

      ${
        listingUrl
          ? `<div style="text-align: center; margin: 28px 0;">
              <a href="${listingUrl}" style="display: inline-block; background: #ff385c; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 15px;">View your listing</a>
            </div>`
          : ''
      }

      <p style="color: #555; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
        Buyers and dealers can now discover your property in search results and via our matchmaking engine. You'll be notified by email whenever someone matches with it or sends you a message.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 12px;" />
      <p style="color: #aaa; font-size: 12px; margin: 0;">ApnaBnB · Real Estate Marketplace</p>
    </div>
  </div>
  `;
};

const sendListingCreatedEmail = async (to, recipientName, details, listingUrl) =>
  sendMail({
    to,
    subject: `Your listing "${details?.title || 'property'}" is live on ApnaBnB`,
    text: `Hi${recipientName ? ` ${recipientName}` : ''}, your listing "${details?.title || 'property'}" is now live on ApnaBnB.${listingUrl ? ` View it here: ${listingUrl}` : ''}`,
    html: buildListingCreatedHtml(recipientName, details, listingUrl),
  });

/* A property going live reads the same as a listing going live, so it reuses
   the template above rather than duplicating it. */
const sendPropertyCreatedEmail = async (to, recipientName, details, propertyUrl) =>
  sendMail({
    to,
    subject: `Your property "${details?.title || 'property'}" is live on ApnaBnB`,
    text: `Hi${recipientName ? ` ${recipientName}` : ''}, your property "${details?.title || 'property'}" is now live on ApnaBnB.${propertyUrl ? ` View it here: ${propertyUrl}` : ''}`,
    html: buildListingCreatedHtml(recipientName, details, propertyUrl),
  });

/* ─── Requirement-created confirmation ─── */
const formatBudget = (budget) => {
  const min = budget?.min;
  const max = budget?.max;
  const has = (v) => v !== null && v !== undefined && !isNaN(Number(v));
  if (has(min) && has(max)) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (has(max)) return `Up to ${formatPrice(max)}`;
  if (has(min)) return `From ${formatPrice(min)}`;
  return '—';
};

const buildRequirementCreatedHtml = (recipientName, details, requirementUrl) => {
  const {
    title = 'your requirement',
    propertyType = '',
    city = '',
    area = '',
    budget,
    bedrooms,
    bathrooms,
    size,
    urgency,
  } = details || {};
  const location = [area, city].filter(Boolean).join(', ') || '—';
  const rooms = [
    bedrooms ? `${bedrooms} Bed` : null,
    bathrooms ? `${bathrooms} Bath` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `
  <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="color: #00856f; margin: 0 0 8px;">Requirement posted ✅</h2>
      <p style="color: #555; line-height: 1.5; margin: 0 0 24px;">
        ${recipientName ? `Hi ${recipientName},` : 'Hi,'} your requirement is now live on ApnaBnB. We'll start matching it against listings straight away.
      </p>

      <div style="background: #fafafa; border: 1px solid #ebebeb; border-radius: 10px; padding: 20px; margin: 0 0 24px;">
        <h3 style="color: #222; margin: 0 0 8px; font-size: 18px;">${title}</h3>
        <p style="color: #717171; margin: 0 0 16px; font-size: 14px;">
          ${propertyType ? `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} · ` : ''}${location}
        </p>
        <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #888;">Budget</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">${formatBudget(budget)}</td>
          </tr>
          ${
            size
              ? `<tr><td style="padding: 4px 0; color: #888;">Size</td><td style="padding: 4px 0; text-align: right;">${size}</td></tr>`
              : ''
          }
          ${
            rooms
              ? `<tr><td style="padding: 4px 0; color: #888;">Rooms</td><td style="padding: 4px 0; text-align: right;">${rooms}</td></tr>`
              : ''
          }
          ${
            urgency
              ? `<tr><td style="padding: 4px 0; color: #888;">Urgency</td><td style="padding: 4px 0; text-align: right;">${urgency}</td></tr>`
              : ''
          }
        </table>
      </div>

      ${
        requirementUrl
          ? `<div style="text-align: center; margin: 28px 0;">
              <a href="${requirementUrl}" style="display: inline-block; background: #ff385c; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 15px;">View your requirement</a>
            </div>`
          : ''
      }

      <p style="color: #555; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
        We'll email you as soon as a property matches what you're looking for.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 12px;" />
      <p style="color: #aaa; font-size: 12px; margin: 0;">ApnaBnB · Real Estate Marketplace</p>
    </div>
  </div>
  `;
};

const sendRequirementCreatedEmail = async (to, recipientName, details, requirementUrl) =>
  sendMail({
    to,
    subject: `Your requirement "${details?.title || 'requirement'}" is live on ApnaBnB`,
    text: `Hi${recipientName ? ` ${recipientName}` : ''}, your requirement "${details?.title || 'requirement'}" is now live on ApnaBnB.${requirementUrl ? ` View it here: ${requirementUrl}` : ''}`,
    html: buildRequirementCreatedHtml(recipientName, details, requirementUrl),
  });

/* ─── Match notification ───
   Renders one match or a digest of many. `items` is a list of
   { title, subtitle, rows: [{ label, value }], score } — the caller shapes the
   domain data so this stays direction-agnostic (supply side vs demand side). */
const buildMatchesHtml = (recipientName, { heading, intro, items = [], ctaUrl, ctaLabel }) => {
  const cards = items
    .map(
      ({ title, subtitle, rows = [], score }) => `
      <div style="background: #fafafa; border: 1px solid #ebebeb; border-radius: 10px; padding: 18px; margin: 0 0 12px;">
        <div style="display: flex; justify-content: space-between;">
          <h3 style="color: #222; margin: 0 0 4px; font-size: 16px;">${title || '—'}</h3>
        </div>
        ${subtitle ? `<p style="color: #717171; margin: 0 0 12px; font-size: 13px;">${subtitle}</p>` : ''}
        <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse;">
          ${rows
            .map(
              ({ label, value }) =>
                `<tr><td style="padding: 3px 0; color: #888;">${label}</td><td style="padding: 3px 0; text-align: right; font-weight: 600;">${value}</td></tr>`,
            )
            .join('')}
          ${
            score !== null && score !== undefined
              ? `<tr><td style="padding: 3px 0; color: #888;">Match score</td><td style="padding: 3px 0; text-align: right; font-weight: 700; color: #00856f;">${Math.round(score)}%</td></tr>`
              : ''
          }
        </table>
      </div>`,
    )
    .join('');

  return `
  <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="color: #00856f; margin: 0 0 8px;">${heading}</h2>
      <p style="color: #555; line-height: 1.5; margin: 0 0 24px;">
        ${recipientName ? `Hi ${recipientName},` : 'Hi,'} ${intro}
      </p>

      ${cards}

      ${
        ctaUrl
          ? `<div style="text-align: center; margin: 28px 0;">
              <a href="${ctaUrl}" style="display: inline-block; background: #ff385c; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 15px;">${ctaLabel || 'View matches'}</a>
            </div>`
          : ''
      }

      <p style="color: #555; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
        Open the match in ApnaBnB to see contact details and start a conversation.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 12px;" />
      <p style="color: #aaa; font-size: 12px; margin: 0;">ApnaBnB · Real Estate Marketplace</p>
    </div>
  </div>
  `;
};

const sendMatchesEmail = async (to, recipientName, payload) =>
  sendMail({
    to,
    subject: payload.subject,
    text: payload.text,
    html: buildMatchesHtml(recipientName, payload),
  });

/* ─── Contact-form enquiry ───
   Sent TO the address the admin configured on the Contact page. replyTo is the
   visitor so the team can just hit reply. Escaped because this is the one
   template whose content comes from an untrusted public form. */
const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sendContactMessageEmail = async (to, { name, email, subject, message }) =>
  sendMail({
    to,
    replyTo: email,
    subject: subject
      ? `[ApnaBnB contact] ${subject}`
      : `[ApnaBnB contact] New message from ${name}`,
    text: `From: ${name} <${email}>\n${subject ? `Subject: ${subject}\n` : ''}\n${message}`,
    html: `
  <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="color: #00856f; margin: 0 0 8px;">New contact enquiry</h2>
      <table style="width: 100%; font-size: 14px; color: #333; border-collapse: collapse; margin: 0 0 20px;">
        <tr><td style="padding: 4px 0; color: #888;">Name</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding: 4px 0; color: #888;">Email</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${escapeHtml(email)}</td></tr>
        ${subject ? `<tr><td style="padding: 4px 0; color: #888;">Subject</td><td style="padding: 4px 0; text-align: right;">${escapeHtml(subject)}</td></tr>` : ''}
      </table>
      <div style="background: #fafafa; border: 1px solid #ebebeb; border-radius: 10px; padding: 18px; white-space: pre-wrap; font-size: 14px; color: #333;">${escapeHtml(message)}</div>
      <p style="color: #888; font-size: 13px; margin: 20px 0 0;">Reply directly to this email to respond to ${escapeHtml(name)}.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 12px;" />
      <p style="color: #aaa; font-size: 12px; margin: 0;">ApnaBnB · Real Estate Marketplace</p>
    </div>
  </div>
  `,
  });

module.exports = {
  sendMail,
  sendOtpEmail,
  sendResetEmail,
  sendListingCreatedEmail,
  sendPropertyCreatedEmail,
  sendRequirementCreatedEmail,
  sendMatchesEmail,
  sendContactMessageEmail,
  formatPrice,
  formatBudget,
};
