// Shared whitelist + coercion for writable Property fields.
// Used by propertyController and adminController so both stay in sync.

const num = (v) =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

const bool = (v) => {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1 || v === '1') return true;
  if (v === 'false' || v === 0 || v === '0') return false;
  return Boolean(v);
};

const str = (v) => (v === undefined ? undefined : v == null ? '' : String(v));

const jsonObj = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v === 'object' && !Array.isArray(v)) return v;
  return undefined;
};

const PK_PHONE = /^(?:\+92|0)?3\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VIDEO_URL = /^(https?:\/\/).+/i;

const CONDITIONS = new Set([
  'brand-new',
  'like-new',
  'good',
  'needs-renovation',
  'under-construction',
]);

/**
 * Whitelist + coerce Property fields from req.body.
 * `partial` keeps only keys present in the body (for updates).
 */
const buildPropertyData = (body, { partial = false } = {}) => {
  const data = {};
  const set = (key, val) => {
    if (val !== undefined) data[key] = val;
  };
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (!partial || has('title')) set('title', str(body.title)?.trim());
  if (!partial || has('description')) set('description', str(body.description));
  if (!partial || has('notes')) set('notes', str(body.notes));
  if (!partial || has('photos'))
    set('photos', Array.isArray(body.photos) ? body.photos.slice(0, 6) : undefined);
  if (!partial || has('videoUrl')) set('videoUrl', str(body.videoUrl)?.trim() || null);
  if (!partial || has('location')) set('location', body.location);
  if (!partial || has('price')) set('price', num(body.price));
  if (!partial || has('priceNegotiable')) set('priceNegotiable', bool(body.priceNegotiable));
  if (!partial || has('purpose')) set('purpose', body.purpose);
  if (!partial || has('category')) set('category', body.category);
  if (!partial || has('propertyType')) set('propertyType', body.propertyType);
  if (!partial || has('size')) set('size', num(body.size));
  if (!partial || has('sizeUnit')) set('sizeUnit', body.sizeUnit);
  if (!partial || has('condition')) set('condition', body.condition || null);
  if (!partial || has('bedrooms')) set('bedrooms', num(body.bedrooms));
  if (!partial || has('bathrooms')) set('bathrooms', num(body.bathrooms));
  if (!partial || has('kitchens')) set('kitchens', num(body.kitchens));
  if (!partial || has('drawingRooms')) set('drawingRooms', num(body.drawingRooms));
  if (!partial || has('diningRooms')) set('diningRooms', num(body.diningRooms));
  if (!partial || has('livingRooms')) set('livingRooms', num(body.livingRooms));
  if (!partial || has('studyRooms')) set('studyRooms', num(body.studyRooms));
  if (!partial || has('storeRooms')) set('storeRooms', num(body.storeRooms));
  if (!partial || has('powderRooms')) set('powderRooms', num(body.powderRooms));
  if (!partial || has('servantQuarters')) set('servantQuarters', num(body.servantQuarters));
  if (!partial || has('floorNumber')) set('floorNumber', num(body.floorNumber));
  if (!partial || has('totalFloors')) set('totalFloors', num(body.totalFloors));
  if (!partial || has('constructionYear')) set('constructionYear', num(body.constructionYear));
  if (!partial || has('facing')) set('facing', str(body.facing)?.trim() || null);
  if (!partial || has('buildingName')) set('buildingName', str(body.buildingName)?.trim() || null);
  if (!partial || has('apartmentNumber')) set('apartmentNumber', str(body.apartmentNumber)?.trim() || null);
  if (!partial || has('parkingSpaces')) set('parkingSpaces', num(body.parkingSpaces));
  if (!partial || has('amenities'))
    set('amenities', Array.isArray(body.amenities) ? body.amenities : undefined);
  if (!partial || has('securityDeposit')) set('securityDeposit', num(body.securityDeposit));
  if (!partial || has('advanceRent')) set('advanceRent', num(body.advanceRent));
  if (!partial || has('leaseTerm')) set('leaseTerm', num(body.leaseTerm));
  if (!partial || has('furnished')) set('furnished', body.furnished);
  if (has('availableFrom'))
    set('availableFrom', body.availableFrom ? new Date(body.availableFrom) : null);
  if (!partial || has('plotDetails')) set('plotDetails', jsonObj(body.plotDetails));
  if (!partial || has('commercialDetails'))
    set('commercialDetails', jsonObj(body.commercialDetails));
  if (!partial || has('contactName')) set('contactName', str(body.contactName));
  if (!partial || has('contactEmail')) set('contactEmail', str(body.contactEmail));
  if (!partial || has('contactPhone')) set('contactPhone', str(body.contactPhone));
  if (!partial || has('contactWhatsapp')) set('contactWhatsapp', str(body.contactWhatsapp));
  if (!partial || has('contactAltPhone')) set('contactAltPhone', str(body.contactAltPhone));
  if (!partial || has('showWhatsapp')) set('showWhatsapp', bool(body.showWhatsapp));
  if (!partial || has('showContact')) set('showContact', bool(body.showContact));
  if (has('status')) set('status', body.status);

  return data;
};

/** Server-side validation. Returns an error message string or null. */
const validatePropertyData = (data, { partial = false } = {}) => {
  const need = (key) => !partial || key in data;

  if (need('title')) {
    const t = (data.title || '').trim();
    if (!t) return 'Title is required.';
    if (t.length < 10) return 'Title must be at least 10 characters.';
    if (t.length > 120) return 'Title must be at most 120 characters.';
  }
  if (need('price')) {
    if (!Number.isFinite(data.price) || data.price <= 0) return 'Enter a valid price.';
  }
  if (need('propertyType') && !data.propertyType) return 'Property type is required.';
  if (need('location')) {
    const loc = data.location || {};
    if (!loc.city) return 'City is required.';
    if (!loc.area) return 'Area is required.';
  }
  if (need('size') && data.size != null && (!(data.size > 0))) return 'Enter a valid size.';
  if (need('photos') && Array.isArray(data.photos) && data.photos.length > 6)
    return 'Maximum 6 photos allowed.';
  if (need('description') && data.description != null) {
    const d = String(data.description).trim();
    if (d && d.length > 2000) return 'Description must be at most 2000 characters.';
  }
  if (need('notes') && data.notes != null && String(data.notes).length > 1000)
    return 'Notes must be at most 1000 characters.';
  if (need('condition') && data.condition && !CONDITIONS.has(data.condition))
    return 'Invalid property condition.';
  if (need('videoUrl') && data.videoUrl && !VIDEO_URL.test(data.videoUrl))
    return 'Video URL must start with http:// or https://.';
  if (need('contactEmail') && data.contactEmail && !EMAIL.test(data.contactEmail))
    return 'Enter a valid contact email.';
  const phoneKeys = ['contactPhone', 'contactWhatsapp', 'contactAltPhone'];
  for (const key of phoneKeys) {
    if (need(key) && data[key]) {
      const cleaned = String(data[key]).replace(/[\s-]/g, '');
      if (cleaned && !PK_PHONE.test(cleaned))
        return `Enter a valid Pakistani mobile for ${key.replace('contact', '').toLowerCase() || 'phone'}.`;
    }
  }
  const intKeys = [
    'bedrooms', 'bathrooms', 'kitchens', 'drawingRooms', 'diningRooms',
    'livingRooms', 'studyRooms', 'storeRooms', 'powderRooms', 'servantQuarters',
    'floorNumber', 'totalFloors', 'constructionYear', 'parkingSpaces', 'leaseTerm',
  ];
  for (const key of intKeys) {
    if (need(key) && data[key] != null && (!Number.isFinite(data[key]) || data[key] < 0))
      return `Invalid value for ${key}.`;
  }
  return null;
};

module.exports = {
  buildPropertyData,
  validatePropertyData,
  num,
};
