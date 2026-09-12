/* e2e: property walkthrough video.
 *
 * Drives the real controllers and the real database. The only stub is
 * Cloudinary's uploader, because the assertions are about WHAT we ask
 * Cloudinary to do — and getting that wrong is invisible in the UI:
 *
 *   Destroying a VIDEO requires resource_type: 'video'. Called with the
 *   default ('image') Cloudinary returns { result: 'not found' } and the file
 *   stays in the account, still billed, forever. Nothing surfaces to the user.
 *
 * Run with: node tests/e2e-video-flow.js
 */
require('dotenv').config({ quiet: true });

const { cloudinary } = require('../config/cloudinary');

// Record every destroy instead of performing it.
const destroys = [];
cloudinary.uploader.destroy = async (publicId, options = {}) => {
  destroys.push({ publicId, resourceType: options.resource_type || 'image' });
  return { result: 'ok' };
};

const prisma = require('../db/prisma');
const propertyController = require('../controllers/propertyController');
const { buildPropertyData } = require('../utils/propertyData');
const { urlToCloudinaryAsset } = require('../utils/cloudinaryPublicId');
const { videoUpload } = require('../config/cloudinary');

const CLOUD = 'https://res.cloudinary.com/demo';
const VIDEO_A = `${CLOUD}/video/upload/v1/apnaBnB/videos/walk-a.mp4`;
const VIDEO_B = `${CLOUD}/video/upload/v1/apnaBnB/videos/walk-b.mp4`;
const PHOTO_A = `${CLOUD}/image/upload/v1/apnaBnB/properties/shot-a.jpg`;

const call = (handler, { body = {}, params = {}, user }) =>
  new Promise((resolve) => {
    const res = {
      _status: 200,
      status(s) { this._status = s; return this; },
      json(b) { resolve({ status: this._status, body: b }); return this; },
    };
    handler({ body, params, user, ip: '127.0.0.1', headers: {} }, res,
      (err) => resolve({ status: err?.status || 500, body: { message: err?.message }, threw: true }));
  });

let passed = 0;
const ok = (label) => { passed += 1; console.log(`PASS: ${label}`); };
const fail = (label, got) => { throw new Error(`${label}\n      got: ${JSON.stringify(got)}`); };

const wait = () => new Promise((r) => setTimeout(r, 250)); // destroys are fire-and-forget

const STAMP = Date.now();
const made = { users: [], properties: [] };

(async () => {
  try {
    /* ── 1. URL parsing tells images and videos apart ───────────────────── */
    const vid = urlToCloudinaryAsset(VIDEO_A);
    const img = urlToCloudinaryAsset(PHOTO_A);
    if (vid?.resourceType !== 'video' || vid.publicId !== 'apnaBnB/videos/walk-a')
      fail('video URL should parse as a video asset', vid);
    if (img?.resourceType !== 'image' || img.publicId !== 'apnaBnB/properties/shot-a')
      fail('image URL should parse as an image asset', img);
    ok('video and image delivery URLs parse to the right resource type');

    /* ── 2. The upload middleware is configured for video ───────────────── */
    if (!videoUpload) fail('videoUpload middleware is missing', {});
    const limit = videoUpload.limits?.fileSize;
    if (!limit || limit < 1024 * 1024) fail('video size limit looks wrong', { limit });
    ok(`video upload middleware exists (limit ${Math.round(limit / 1024 / 1024)}MB)`);

    // The filter must accept real video mime types and reject everything else.
    const filter = videoUpload.fileFilter;
    const tryMime = (mimetype) =>
      new Promise((resolve) => filter({}, { mimetype }, (err, pass) => resolve(!err && pass)));
    if (!(await tryMime('video/mp4'))) fail('mp4 should be accepted', {});
    if (!(await tryMime('video/quicktime'))) fail('mov should be accepted', {});
    if (await tryMime('image/png')) fail('an image must not pass the video filter', {});
    if (await tryMime('application/pdf')) fail('a pdf must not pass the video filter', {});
    ok('video filter accepts mp4/mov and rejects images and documents');

    /* ── 3. videoUrl survives a create ──────────────────────────────────── */
    const user = await prisma.user.create({
      data: {
        name: 'E2E Video', email: `e2e-video-${STAMP}@example.com`,
        authProvider: 'email', password: null, role: 'seller', verified: true,
        phone: '+92 300 1112222', location: 'Test',
      },
    });
    made.users.push(user.id);

    const built = buildPropertyData({
      title: 'E2E video listing', price: 5000000, propertyType: 'house',
      location: { city: 'Lahore', area: 'Gulberg', coordinates: { lat: 31.5, lng: 74.3 } },
      photos: [PHOTO_A], videoUrl: VIDEO_A,
    });
    if (built.videoUrl !== VIDEO_A)
      fail('buildPropertyData dropped videoUrl', { got: built.videoUrl });
    ok('buildPropertyData keeps videoUrl');

    const property = await prisma.property.create({
      data: { ...built, listedById: user.id, actingRole: 'seller' },
    });
    made.properties.push(property.id);
    if (property.videoUrl !== VIDEO_A) fail('videoUrl not persisted', property.videoUrl);
    ok('videoUrl persists to the database');

    /* ── 4. Replacing the video destroys the old one AS A VIDEO ─────────── */
    destroys.length = 0;
    const replaced = await call(propertyController.updateProperty, {
      params: { id: property.id },
      user: { id: user.id, role: 'seller', viewRole: 'seller' },
      body: { videoUrl: VIDEO_B },
    });
    if (replaced.status !== 200) fail('update should succeed', replaced);
    await wait();

    const videoDestroy = destroys.find((d) => d.publicId === 'apnaBnB/videos/walk-a');
    if (!videoDestroy) fail('the replaced video should have been destroyed', destroys);
    if (videoDestroy.resourceType !== 'video')
      fail('THE BUG: a video must be destroyed with resource_type "video", or Cloudinary silently keeps it', videoDestroy);
    ok('replacing a video destroys the old one with resource_type "video"');

    /* ── 5. Clearing the video destroys it too ──────────────────────────── */
    destroys.length = 0;
    await call(propertyController.updateProperty, {
      params: { id: property.id },
      user: { id: user.id, role: 'seller', viewRole: 'seller' },
      body: { videoUrl: '' },
    });
    await wait();
    const cleared = await prisma.property.findUnique({ where: { id: property.id } });
    if (cleared.videoUrl !== null) fail('clearing should null the column', cleared.videoUrl);
    const clearDestroy = destroys.find((d) => d.publicId === 'apnaBnB/videos/walk-b');
    if (!clearDestroy) fail('the cleared video should have been destroyed', destroys);
    if (clearDestroy.resourceType !== 'video')
      fail('a cleared video must be destroyed as a video', clearDestroy);
    ok('clearing the video destroys it as a video and nulls the column');

    /* ── 6. Photos are untouched by video edits ─────────────────────────── */
    if (destroys.some((d) => d.publicId.includes('properties/shot-a')))
      fail('a video edit must not destroy the photos', destroys);
    const stillHasPhoto = await prisma.property.findUnique({ where: { id: property.id } });
    if (!stillHasPhoto.photos.includes(PHOTO_A)) fail('photos were lost', stillHasPhoto.photos);
    ok('editing the video leaves photos alone');

    /* ── 7. An unchanged video is NOT destroyed ─────────────────────────── */
    await prisma.property.update({ where: { id: property.id }, data: { videoUrl: VIDEO_A } });
    destroys.length = 0;
    await call(propertyController.updateProperty, {
      params: { id: property.id },
      user: { id: user.id, role: 'seller', viewRole: 'seller' },
      body: { videoUrl: VIDEO_A, title: 'E2E video listing renamed' },
    });
    await wait();
    if (destroys.length)
      fail('saving without changing the video must not destroy it', destroys);
    ok('saving an unchanged video does not destroy it');

    /* ── 8. The video is OPTIONAL ───────────────────────────────────────
       A listing must save with no video at all, and a blank field from the
       form must normalise rather than fail validation. */
    const noVideo = buildPropertyData({
      title: 'E2E listing with no video', price: 4000000, propertyType: 'flat',
      location: { city: 'Lahore', area: 'Gulberg', coordinates: { lat: 31.5, lng: 74.3 } },
      photos: [PHOTO_A],
    });
    if (noVideo.videoUrl !== null && noVideo.videoUrl !== undefined)
      fail('omitting the video should leave videoUrl empty, not error', noVideo.videoUrl);

    const plain = await prisma.property.create({
      data: {
        ...noVideo,
        videoUrl: noVideo.videoUrl ?? null,
        listedById: user.id,
        actingRole: 'seller',
      },
    });
    made.properties.push(plain.id);
    if (plain.videoUrl !== null) fail('a video-less listing should store null', plain.videoUrl);
    ok('a listing saves with no video at all (the field is optional)');

    // A blank string from the form must normalise, not be rejected.
    const blank = buildPropertyData({ title: 'x', videoUrl: '   ' }, { partial: true });
    if (blank.videoUrl !== null) fail('a blank video field should normalise to null', blank.videoUrl);
    ok('a blank video field normalises to null rather than failing validation');

    console.log(`\nALL ${passed} VIDEO CHECKS PASSED OK`);
  } finally {
    for (const id of made.properties) await prisma.property.delete({ where: { id } }).catch(() => {});
    for (const id of made.users) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('\nE2E FAILED:', e.message || e); process.exit(1); });
