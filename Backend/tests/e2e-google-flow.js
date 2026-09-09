require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../db/prisma');
const auth = require('../controllers/authController');
const security = require('../controllers/securityController');

const mockRes = () => {
  const r = { _status: null, _body: null, status(s) { r._status = s; return r; }, json(b) { r._body = b; return r; } };
  return r;
};
const GOOGLE_EMAIL = `e2e-google-${Date.now()}@example.com`;
const EMAIL_EMAIL = `e2e-email-${Date.now()}@example.com`;
let googleId, emailId;

(async () => {
  try {
    // 1. Create a Google-provider account exactly as googleComplete does.
    googleId = (await prisma.user.create({
      data: {
        name: 'E2E Google', email: GOOGLE_EMAIL,
        authProvider: 'google', password: null, role: 'buyer', verified: true,
        phone: '+92 300 1234567', location: 'Test',
      },
    })).id;

    // 2. Password login on a Google account → SOCIAL_ACCOUNT (the message that
    //    tells the user to use Continue with Google).
    const loginRes = mockRes();
    await auth.loginUser({ body: { email: GOOGLE_EMAIL, password: 'anything123!' }, ip: '127.0.0.1' }, loginRes, (e) => { throw e; });
    if (loginRes._body?.code !== 'SOCIAL_ACCOUNT') throw new Error('expected SOCIAL_ACCOUNT, got ' + JSON.stringify(loginRes._body));
    console.log('PASS: Google-only account password-login → SOCIAL_ACCOUNT (use Continue with Google)');

    // 3. Forgot password on a Google account → SOCIAL_ONLY, no reset email.
    const forgotRes = mockRes();
    await auth.forgotPassword({ body: { email: GOOGLE_EMAIL }, ip: '127.0.0.1' }, forgotRes, (e) => { throw e; });
    if (forgotRes._body?.code !== 'SOCIAL_ONLY') throw new Error('expected SOCIAL_ONLY, got ' + JSON.stringify(forgotRes._body));
    console.log('PASS: Google-only account forgot-password → SOCIAL_ONLY (no reset sent)');

    // 4. Login & security overview exposes provider + hasPassword.
    const overviewRes = mockRes();
    await security.getOverview({ user: { id: googleId }, ip: '127.0.0.1' }, overviewRes, (e) => { throw e; });
    if (overviewRes._body?.authProvider !== 'google' || overviewRes._body?.hasPassword !== false) {
      throw new Error('bad overview: ' + JSON.stringify(overviewRes._body));
    }
    console.log('PASS: security overview → authProvider=google, hasPassword=false');

    // 5. Passwords-only guard on requirePassword (change-password path).
    const changeRes = mockRes();
    await security.changePassword({ body: { currentPassword: 'x', newPassword: 'NewPassword123!' }, user: { id: googleId }, ip: '127.0.0.1' }, changeRes, (e) => { throw e; });
    if (changeRes._body?.code !== 'SOCIAL_ACCOUNT') throw new Error('expected SOCIAL_ACCOUNT on change, got ' + JSON.stringify(changeRes._body));
    console.log('PASS: Google-only account change-password → SOCIAL_ACCOUNT (no password to verify)');

    // 6. A normal email account is unaffected.
    emailId = (await prisma.user.create({
      data: {
        name: 'E2E Email', email: EMAIL_EMAIL,
        authProvider: 'email',
        password: await bcrypt.hash('Correct#Pass1', 10),
        role: 'buyer', verified: true, phone: '+92 300 7654321',
      },
    })).id;
    const wrongRes = mockRes();
    await auth.loginUser({ body: { email: EMAIL_EMAIL, password: 'Wrong#Pass1' }, ip: '127.0.0.1' }, wrongRes, (e) => { throw e; });
    if (wrongRes._body?.code !== 'WRONG_PASSWORD') throw new Error('expected WRONG_PASSWORD, got ' + JSON.stringify(wrongRes._body));
    console.log('PASS: email-only account wrong password → WRONG_PASSWORD (normal flow intact)');

    const goodRes = mockRes();
    await auth.loginUser({ body: { email: EMAIL_EMAIL, password: 'Correct#Pass1' }, ip: '127.0.0.1' }, goodRes, (e) => { throw e; });
    if (!goodRes._body || (goodRes._body.code && goodRes._body.code !== 'ACCOUNT_DEACTIVATED') || (!goodRes._body.token && !goodRes._body.twoFactorRequired)) {
      throw new Error('expected successful login, got ' + JSON.stringify(goodRes._body));
    }
    console.log('PASS: email-only account correct password → session/2FA challenge (login works)');

    console.log('\nALL GOOGLE/EMAIL AUTH E2E CHECKS PASSED OK');
  } finally {
    if (googleId) await prisma.user.delete({ where: { id: googleId } }).catch(() => {});
    if (emailId) await prisma.user.delete({ where: { id: emailId } }).catch(() => {});
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('E2E FAILED:', e); process.exit(1); });