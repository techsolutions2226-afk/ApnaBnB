// Admin account-lifecycle tests — account deletion cleanup & session kill.
// Run with: npm test (node --test tests)
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { urlToCloudinaryPublicId } = require('../controllers/adminController');
const { kickUser } = require('../sockets');

test('urlToCloudinaryPublicId: extracts public id from a modern versioned URL', () => {
  const url =
    'https://res.cloudinary.com/apnabnb/image/upload/v1613520000/apnaBnB/properties/abc123.jpg';
  assert.equal(
    urlToCloudinaryPublicId(url),
    'apnaBnB/properties/abc123',
  );
});

test('urlToCloudinaryPublicId: handles URLs without a version segment', () => {
  const url =
    'https://res.cloudinary.com/demo/image/upload/apnaBnB/properties/xyz987.png';
  assert.equal(urlToCloudinaryPublicId(url), 'apnaBnB/properties/xyz987');
});

test('urlToCloudinaryPublicId: handles multi-extension (transformed) assets', () => {
  const url =
    'https://res.cloudinary.com/demo/image/upload/v1/apnaBnB/properties/photo_1_q.webp';
  assert.equal(urlToCloudinaryPublicId(url), 'apnaBnB/properties/photo_1_q');
});

test('urlToCloudinaryPublicId: returns null for external (non-Cloudinary) URLs', () => {
  assert.equal(
    urlToCloudinaryPublicId('https://lh3.googleusercontent.com/a/photo-u7'),
    null,
  );
  assert.equal(urlToCloudinaryPublicId(null), null);
  assert.equal(urlToCloudinaryPublicId(undefined), null);
  assert.equal(urlToCloudinaryPublicId(''), null);
  assert.equal(urlToCloudinaryPublicId(42), null);
});

test('urlToCloudinaryPublicId: returns null for non-upload paths', () => {
  const url = 'https://res.cloudinary.com/demo/video/upload/v1/apnaBnB/movie.mp4';
  assert.equal(urlToCloudinaryPublicId(url), null);
});

test('kickUser: no-ops safely when sockets are not initialised', () => {
  // getIO()/io are null until initSockets() runs (as in test contexts), so
  // kickUser must return false and never throw.
  assert.equal(kickUser('some-id', 'account suspended'), false);
  assert.equal(kickUser(undefined), false);
  assert.equal(kickUser(null), false);
});