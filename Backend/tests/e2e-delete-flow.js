require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../db/prisma');
const { cloudinary } = require('../config/cloudinary');

const destroyed = [];
const originalDestroy = cloudinary.uploader.destroy.bind(cloudinary.uploader);
cloudinary.uploader.destroy = (publicId) => {
  destroyed.push(publicId);
  return Promise.resolve({ result: 'ok' });
};

const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

const NEW_EMAIL = `e2e-delete-${Date.now()}@example.com`;

/* Verify a token: resolves with { next: req.user } on success (next() called)
   or { res: responseBody } when the middleware responds with status/json. */
const verifyExpecting = (token) =>
  new Promise((resolve) => {
    const res = {
      status() { return this; },
      json(body) { resolve({ res: body }); },
    };
    verifyToken(
      { headers: { authorization: `Bearer ${token}` }, ip: '127.0.0.1' },
      res,
      () => resolve({ ok: 'request passed to route' }),
    );
  });

const mockRes = () => {
  const r = {
    _status: null,
    _body: null,
    status(s) { r._status = s; return r; },
    json(b) { r._body = b; return r; },
  };
  return r;
};

(async () => {
  let userId, propId, payId;
  try {
    userId = (await prisma.user.create({
      data: {
        name: 'E2E Delete Test',
        email: NEW_EMAIL,
        password: await bcrypt.hash('E2e@strong!1Pass', 10),
        role: 'seller',
        verified: true,
        suspended: false,
        avatar: 'https://res.cloudinary.com/apnabnb/image/upload/v1/apnaBnB/profile-images/avatar-e2e.jpg',
      },
    })).id;

    propId = (await prisma.property.create({
      data: {
        title: 'E2E Delete Property',
        purpose: 'sale',
        category: 'home',
        propertyType: 'house',
        price: 1000000,
        location: { city: 'Rawalpindi' },
        status: 'active',
        listedById: userId,
        photos: [
          'https://res.cloudinary.com/apnabnb/image/upload/v1/apnaBnB/properties/p1-main.jpg',
          'https://res.cloudinary.com/apnabnb/image/upload/apnaBnB/properties/p1-gallery.png',
        ],
      },
    })).id;

    payId = (await prisma.payment.create({
      data: {
        userId,
        planId: 'plan-basic',
        planName: 'Basic',
        billingCycle: 'monthly',
        amount: 1000,
        currency: 'PKR',
        status: 'approved',
        proofUrl: 'https://res.cloudinary.com/apnabnb/image/upload/v1/apnaBnB/payment-proofs/proof-e2e.jpg',
      },
    })).id;

    const token = jwt.sign({ id: userId, role: 'seller', tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '30d' });

    // 1. Healthy session passes.
    const healthy = await verifyExpecting(token);
    if (healthy.ok !== 'request passed to route') throw new Error('healthy session blocked');
    console.log('PASS: healthy session passes authMiddleware');

    // 2. Admin suspends → old token rejected (ACCOUNT_SUSPENDED), even though
    //    the JWT itself remains technically valid until expiry.
    await adminController.suspendUser(
      { params: { id: userId }, body: { reason: 'e2e test' }, ip: '127.0.0.1', user: { id: 'admin-xyz', role: 'admin' } },
      mockRes(),
      (e) => { throw e; },
    );
    const suspended = await verifyExpecting(token);
    if (suspended.res?.code !== 'ACCOUNT_SUSPENDED') throw new Error('suspend did not kill session; got ' + JSON.stringify(suspended.res));
    console.log('PASS: suspended account rejects the old token (ACCOUNT_SUSPENDED)');

    // 3. Unsuspend → the pre-suspend token is still dead via tokenVersion bump.
    await adminController.unsuspendUser(
      { params: { id: userId }, ip: '127.0.0.1', user: { id: 'admin-xyz', role: 'admin' } },
      mockRes(),
      (e) => { throw e; },
    );
    const revoked = await verifyExpecting(token);
    if (revoked.res?.code !== 'SESSION_REVOKED') throw new Error('tokenVersion bump did not revoke; got ' + JSON.stringify(revoked.res));
    console.log('PASS: unsuspended account still rejects the pre-suspend token (SESSION_REVOKED)');

    // 4. Admin deactivates → old token rejected (new ACCOUNT_DEACTIVATED guard).
    await adminController.deactivateUser(
      { params: { id: userId }, body: { reason: 'e2e test' }, ip: '127.0.0.1', user: { id: 'admin-xyz', role: 'admin' } },
      mockRes(),
      (e) => { throw e; },
    );
    const deactivated = await verifyExpecting(token);
    if (deactivated.res?.code !== 'ACCOUNT_DEACTIVATED') throw new Error('deactivate did not kill session; got ' + JSON.stringify(deactivated.res));
    console.log('PASS: deactivated account rejects the old token (ACCOUNT_DEACTIVATED)');

    // 5. Even a freshly-minted token (matches tokenVersion=2) is rejected while
    //    the account stays deactivated.
    const freshToken = jwt.sign({ id: userId, role: 'seller', tokenVersion: 2 }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const stillDeactivated = await verifyExpecting(freshToken);
    if (stillDeactivated.res?.code !== 'ACCOUNT_DEACTIVATED') throw new Error('fresh token accepted for deactivated account');
    console.log('PASS: fresh-tokenised deactivated account still rejected (ACCOUNT_DEACTIVATED)');

    // 6. Reactivate, then admin deletes → cascade + Cloudinary purge + token dead.
    await adminController.reactivateUser(
      { params: { id: userId }, ip: '127.0.0.1', user: { id: 'admin-xyz', role: 'admin' } },
      mockRes(),
      (e) => { throw e; },
    );
    await adminController.deleteUser(
      { params: { id: userId }, ip: '127.0.0.1', user: { id: 'admin-xyz', role: 'admin' } },
      mockRes(),
      (e) => { throw e; },
    );

    const gone = await prisma.user.findUnique({ where: { id: userId } });
    const propGone = await prisma.property.findUnique({ where: { id: propId } });
    const payGone = await prisma.payment.findUnique({ where: { id: payId } });
    if (gone || propGone || payGone) throw new Error('cascade delete left rows behind');
    console.log('PASS: user + property + payment rows cascade-deleted');

    const expected = [
      'apnaBnB/profile-images/avatar-e2e',
      'apnaBnB/properties/p1-main',
      'apnaBnB/properties/p1-gallery',
      'apnaBnB/payment-proofs/proof-e2e',
    ].sort();
    const actual = [...new Set(destroyed)].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error('Cloudinary purge mismatch: got ' + JSON.stringify(actual) + ' expected ' + JSON.stringify(expected));
    }
    console.log('PASS: Cloudinary assets purged: ' + actual.join(' | '));

    const deleted = await verifyExpecting(freshToken);
    if (deleted.res?.code !== 'USER_NOT_FOUND') throw new Error('deleted token not rejected; got ' + JSON.stringify(deleted.res));
    console.log('PASS: deleted account token rejected (USER_NOT_FOUND)');

    console.log('\nALL E2E CHECKS PASSED OK');
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    if (propId) await prisma.property.delete({ where: { id: propId } }).catch(() => {});
    if (payId) await prisma.payment.delete({ where: { id: payId } }).catch(() => {});
    cloudinary.uploader.destroy = originalDestroy;
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('E2E FAILED:', e); process.exit(1); });