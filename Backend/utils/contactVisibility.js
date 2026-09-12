/* ─── contactVisibility ───
   One place that decides which contact details a response may carry.

   A property's contact fields, and its lister's phone/email, are public only
   while the owner leaves `showContact` on. When it is off they must be removed
   from EVERY response that carries the property — not just the property page.
   Listing endpoints used to return `property: true` untouched, so the toggle
   was bypassed by anyone calling /api/listings directly.

   The owner and admins are exempt: the edit form loads its values from these
   same endpoints, and stripping the fields for the owner would load blank
   inputs that then save over the real data.
*/

const CONTACT_FIELDS = [
  'contactName',
  'contactEmail',
  'contactPhone',
  'contactWhatsapp',
  'contactAltPhone',
];

/* The viewer may see hidden contact details on their own listing, or as an
   admin. `viewer` is req.user — undefined for an anonymous request. */
const canSeeHiddenContact = (viewer, ownerId) =>
  Boolean(viewer) && (viewer.role === 'admin' || (ownerId && viewer.id === ownerId));

/* Mutates and returns the property. Safe on null. */
const scrubPropertyContact = (property, viewer) => {
  if (!property || property.showContact !== false) return property;
  if (canSeeHiddenContact(viewer, property.listedById)) return property;

  CONTACT_FIELDS.forEach((field) => {
    delete property[field];
  });
  if (property.listedBy) {
    delete property.listedBy.phone;
    delete property.listedBy.email;
  }
  return property;
};

/* A listing row carries its property under `property`. */
const scrubListingContact = (listing, viewer) => {
  if (listing?.property) scrubPropertyContact(listing.property, viewer);
  return listing;
};

module.exports = {
  CONTACT_FIELDS,
  canSeeHiddenContact,
  scrubPropertyContact,
  scrubListingContact,
};
