# ApnaBnB — Changes Log

A summary of every change made in this session. Each item has 4–5 lines explaining the *what* + the *why*.

---

## 1. Phase 3 completion — Mock data migration
Moved 4 pages (Home, Plans, Services, Experiences) off the mock `src/data/` folder
and into a new `src/config/` directory. These pages now treat their content as
static UI configuration rather than fake data waiting for an API. The build is
clean and the four files contain filter functions / pricing tiers that have no
real backend equivalent — putting them in `/config/` properly categorises them.

---

## 2. Maps stack — Google Maps → OpenStreetMap (Leaflet)
Replaced the broken Google Maps integration (`ApiTargetBlockedMapError`) with
`react-leaflet` + OSM tiles. `MapView.jsx` now uses an OSM iframe and
`LocationPicker.jsx` uses Leaflet's click-to-pin. No API key, no billing, no
GCP setup needed. Forward + reverse geocoding via Nominatim (also free) so
the map recenters when an area is picked and city/area auto-fill when a pin
is dropped.

---

## 3. ListingForm undefined-reference bugs
Fixed three `ReferenceError`s that blanked the Create Listing page: `CITIES`,
`AREAS_BY_CITY`, and `CITY_CENTERS` were used but never defined. Added proper
constants for 8 Pakistani cities and 60+ areas. The form now renders properly
with cascading City → Area dropdowns, plus "Other" free-text fallback so users
can list properties in unsupported cities/areas.

---

## 4. Listing draft auto-save
Added `client/src/utils/listingDraft.js` — saves form state to localStorage
per user as you type. If the user closes the tab mid-listing, reopening the
Create Listing page restores everything (with a yellow banner showing the
last-edited timestamp + a Discard button). Cleared automatically after a
successful submit via `clearListingDraft(userId)` in CreateListing.jsx.

---

## 5. Forward + reverse geocoding for the location picker
LocationPicker now drops a pin and silently calls Nominatim's reverse
geocoder. Auto-fills city + area when blank (never overwrites a value the
user already chose). Conversely, picking a known city + area triggers
forward geocoding that flies the map straight to that neighbourhood. Both
use the shared helpers in `client/src/utils/geocode.js`.

---

## 6. Match engine — strict criteria + accurate relationship types
Rewrote `isMatchCandidate` in `Backend/utils/matchScore.js` to enforce
city + area + propertyType + price ±10% as a hard pre-filter. Added a
`determineMatchType` helper that derives match type from BOTH owners'
roles, producing 4 relationship types: `seller-buyer`, `dealer-buyer`,
`dealer-dealer`, `seller-dealer`. Match.js enum extended accordingly.

---

## 7. `GET /api/matches/mine` endpoint + RecentMatches component
New backend endpoint returns every match where the current user owns the
property OR posted the requirement. Frontend `useMyMatches()` hook +
`RecentMatches.jsx` shared component renders colour-pill match cards
(Seller↔Buyer = green, Dealer↔Buyer = blue, Dealer↔Dealer = purple,
Seller↔Dealer = orange). Used by all 3 dashboards.

---

## 8. Default Property.status flipped pending → active
Newly listed properties were defaulting to `'pending'` but the match
generator filtered by `status: 'active'`, so brand-new properties never
participated in matches. Flipped the default to `'active'` and updated
`generateMatchesForRequirement` to exclude only `'sold'` properties.
Ran a one-shot migration script that fixed 3 stale `pending` records.

---

## 9. Manage Listings + Requirements Board buttons on Seller dashboard
Added a prominent black pill button "📋 Manage Listings" next to the
"My Listings" section header on the Seller dashboard. Also added a
"📝 Requirements Board" Quick Action button. Updated App.jsx route so
sellers (not just dealers) can access `/requirements`. RequirementsBoard
breadcrumb now goes to the user's actual dashboard via `currentUser.role`.

---

## 10. NotificationBell in navbar
New `NotificationBell.jsx` component sitting in the navbar between the
Dashboard button and the Globe icon. Reads from `useMyMatches()`, shows
a red unread-count badge (capped at "9+"). Click opens a 360 px dropdown
with the 10 most-recent matches. Read state tracked per user in localStorage
(`notif_seen:<userId>` = JSON array of seen match IDs).

---

## 11. ResetPassword.jsx blank-page bug fix
The reset-password page referenced `<img src={logo} />` but never imported
`logo`. After token validation succeeded, the page hit `ReferenceError` and
went blank — users couldn't actually reset their password. Swapped to the
existing `<Logo size={56} />` component (same pattern as ForgotPassword).
Reset flow now works end-to-end (request → email → click link → new password).

---

## 12. Login wrong-password toast not showing
The axios apiClient interceptor was redirecting every 401 to `/login` via
`window.location.href`, which blew away the toast before it could render.
Fixed by skipping the redirect when the failing request is itself to an
auth endpoint (you can't be "session-expired" if you're trying to log in).
Wrong-password / email-not-found / unverified-email now show proper toasts.

---

## 13. Signup password — strength bar → 4-rule checklist
Removed the multi-segment colour strength bar. Replaced with 4 live checks
beneath the password input: Lowercase letter, Uppercase letter, Numeric digit,
Special character. Each chip starts grey (○) and flips to green (✓ + bold)
the moment its rule is satisfied. Validation order in `validate()` mirrors
the chip order so error messages match what's visible.

---

## 14. AES-256-GCM encryption at rest for messages
New `Backend/utils/messageCrypto.js` provides `encryptMessage()` /
`decryptMessage()` using AES-256-GCM with per-message random IV (12 bytes)
and a 16-byte auth tag. Format: `v1:<iv>:<authTag>:<cipher>` (all hex).
Wired into `Message.js` via Mongoose setter/getter so controllers see
plaintext but Mongo stores ciphertext. PII regex still runs before encryption.

---

## 15. Real-time messaging with Socket.IO
Installed `socket.io` (backend) and `socket.io-client` (frontend). New
`Backend/sockets/index.js` attaches to the HTTP server, validates JWT on
handshake, auto-joins each user to their conversation rooms, handles
`send_message` events. Frontend singleton in `client/src/api/socket.js`
plus `useSocket()` hook makes the connection available app-wide.

---

## 16. WhatsApp-style Messages UI
Full rewrite of `client/src/pages/Messages.jsx`. Two-pane layout: left
sidebar lists conversations with last-message preview + unread badge +
relative time. Right pane shows chat bubbles (green for sent, white for
received) with date separators ("Today" / "Yesterday" / "Jan 5"). Auto-
scroll on new messages. ~300 lines of dedicated CSS in `Messages.css`.

---

## 17. Chat image attachments + browser notifications + sound
Composer has a 📎 paperclip button → uploads via existing Cloudinary
endpoint → image attaches to the next message. Bubbles render `<img>`
inline. New messages in a backgrounded tab fire a `Notification` (with
preview text and avatar icon) + play a Web-Audio-API "ping" beep. No
asset files needed — sound is synthesised at runtime.

---

## 18. `/api/conversations/direct` — find-or-create endpoint
New route to find an existing 1-1 conversation between the current user
and `otherUserId`, or create one if none exists. Used by every "Message"
button across the app (matches, dealer profile, PropertyDetail). All
"Message" links now point at `/messages?with=<userId>` which auto-opens
or creates the conversation on landing.

---

## 19. Listing creation email confirmation
After a Listing is created, an async IIFE fires `sendListingCreatedEmail()`
to the lister. Template includes property title, type, location, price,
size, beds/baths, and a "View your listing" CTA pointing at
`/listing/:id`. Wrapped in try/catch so SMTP failures don't break the
listing creation itself.

---

## 20. Atlas vs local Mongo switching + seed
Switched the connection string in `Backend/.env` between Atlas and local
MongoDB Compass multiple times during the session. Created a one-shot
script to run `Property.updateMany({ status: 'pending' }, { active })`
and re-run match generation for fresh data. Ran `npm run seed:reset`
against both DBs to populate 11 users / 20 properties / 12 requirements / etc.

---

## 21. GitHub push — fixed cached-credential mismatch
Cleared a stale Windows Credential Manager entry that was authenticating
as `243348-tech` instead of `AlyanShahbaz2022`. GitHub kept returning
"Repository not found" because the wrong account couldn't see the private
repo. After `git credential-manager erase`, the next push went through and
uploaded the entire project (including .env files per the user's request).

---

## 22. Buy/Sell vs Rental analysis
Wrote `project.md` clarifying that ApnaBnB is structurally a buy/sell
marketplace, not a rental service (despite the "BnB" name). The data
model, roles (seller/buyer/dealer), pricing (lump-sum), and match types
all encode purchase semantics. Documented the path to add hybrid sale +
rent support without breaking existing data.

---

## 23. Property model — purpose + category + 4 rental fields
Added `purpose` enum (`sale | rent`, default sale) and `category` enum
(`home | plot | commercial`, default home) to the Property schema. Expanded
`propertyType` enum to 18 leaf types covering all 3 categories. Added
rental-specific fields: `securityDeposit`, `leaseTerm`, `furnished`,
`availableFrom`. Added `'rented'` to the `status` enum.

---

## 24. Per-listing contact override fields
Property now has `contactName`, `contactEmail`, `contactPhone` fields.
Defaults to the lister's User-profile values on the frontend, but each
listing can override them (e.g. a dealer using a different phone for
this property vs their main number). All three are mandatory at submit
so buyers always have a way to reach out.

---

## 25. Requirement model — purpose field
Mirrored the purpose enum on Requirement. The match engine now refuses
to cross-match sale ↔ rent (sale property never matches rent requirement
and vice versa). One new line in `isMatchCandidate`:
`if (pPurpose !== rPurpose) return false;`. Smoke-tested with a sale
property vs rent requirement — correctly returns `false`.

---

## 26. ListingForm — full structural rewrite
New top-to-bottom flow: (1) Purpose card toggle, (2) Category cards →
subtype chips, (3) City + Area (existing), (4) Map pin, (5) Size + price
(label flips to "Monthly Rent" for rent), (6) Conditional Bedrooms/Bath
(home only), (7) Grouped amenities, (8) Contact info, (9) Images.
Conditional rental fields (security deposit, lease term, furnishing,
available-from) appear when purpose = rent.

---

## 27. Zameen-style grouped amenities
Replaced the flat 9-checkbox amenities row with 6 categorised groups
matching zameen.com: Main Features, Business & Communication, Community
Features, Healthcare, Nearby Locations, Other Facilities. Each amenity
is a pill with a circular + → ✓ indicator. Active chips highlight green.
~50 amenities total across the 6 groups.

---

## 28. CreateListing payload — propagates all new fields
Updated `client/src/pages/CreateListing.jsx` to pass `purpose`, `category`,
`securityDeposit`, `leaseTerm`, `furnished`, `availableFrom`, `contactName`,
`contactEmail`, `contactPhone`, and the new `propertyType` (kebab-case)
through to the backend `createProperty` API. Removed the legacy
`toLowerCase()` because subtypes are already lowercase kebab.

---

## 29. Listing.css — 250 new lines for the new UI
Added styling for: purpose cards (active = green outline + tinted background),
category cards (active = red outline like Airbnb), subtype chips (active =
black pill), grouped amenities (cards with section titles + active = green
chip + circle), responsive collapse to single column under 600 px. Tones
match the rest of the app (red/green accents, neutral greys).

---

*Generated as a quick changelog for FYP defense reference. Each item maps to a
specific file or two — see git log for exact diffs.*
