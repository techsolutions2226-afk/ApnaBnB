/**
 * Expand a compact seed property row into a full Prisma Property create payload
 * matching the expanded listing schema (rooms, plot/commercial bags, contact, etc.).
 */

const AMENITY_ALIASES = {
  Parking: 'Parking',
  Security: 'Security',
  'Backup Generator': 'Generator',
  Generator: 'Generator',
  Lawn: 'Lawn',
  'Central Heating': 'Central heating',
  Elevator: 'Lift / Elevator',
  'Lift / Elevator': 'Lift / Elevator',
  'Swimming Pool': 'Swimming pool',
  'Servant Quarter': 'Servant quarter',
  Gym: 'Community gym',
  'Backup power': 'Backup power',
  Reception: 'Reception',
};

const normalizeAmenities = (list = []) => [
  ...new Set(list.map((a) => AMENITY_ALIASES[a] || a).filter(Boolean)),
];

const facingOptions = ['North', 'South', 'East', 'West', 'North-East', 'South-West'];

/**
 * @param {object} d Compact seed definition (supports both bed/bath and bedrooms/bathrooms)
 * @param {{ owner: object, photos: string[], createdAt?: Date, actingRole?: string, index?: number }} opts
 */
function toPropertyCreateData(d, { owner, photos, createdAt, actingRole, index = 0 } = {}) {
  const bed = d.bed ?? d.bedrooms ?? 0;
  const bath = d.bath ?? d.bathrooms ?? 0;
  const unit = d.unit || d.sizeUnit || 'Marla';
  const isHome = d.category === 'home';
  const isPlot = d.category === 'plot';
  const isCommercial = d.category === 'commercial';
  const isFlat = ['flat', 'apartment', 'penthouse'].includes(d.propertyType);
  const isRent = d.purpose === 'rent';
  const titleLower = String(d.title || '').toLowerCase();

  const location = {
    city: d.city,
    area: d.area,
    locality: d.locality || d.area,
    ...(d.block ? { block: d.block } : {}),
    ...(d.street ? { street: d.street } : {}),
    ...(d.landmark
      ? { landmark: d.landmark }
      : { landmark: `Near ${d.area} main market` }),
    ...(d.lat != null && d.lng != null
      ? { coordinates: { lat: d.lat, lng: d.lng } }
      : {}),
  };

  let condition = d.condition || null;
  if (!condition && !isPlot) {
    if (titleLower.includes('brand new')) condition = 'brand-new';
    else if (titleLower.includes('furnished')) condition = 'like-new';
    else condition = 'good';
  }

  const data = {
    title: d.title,
    description:
      d.description ||
      `${d.title}. ${isRent ? 'Monthly rent' : 'Sale price'} in PKR. Well-maintained ${String(
        d.propertyType,
      ).replace(/-/g, ' ')} in ${d.area}, ${d.city}, close to main access roads, markets and schools.`,
    notes:
      d.notes ||
      (isPlot
        ? 'Possession and utility connections confirmed. Documents clear.'
        : 'Serious inquiries only. Viewing by appointment.'),
    photos: Array.isArray(photos) ? photos.slice(0, 6) : [],
    videoUrl: d.videoUrl || null,
    location,
    purpose: d.purpose,
    price: d.price,
    priceNegotiable: d.priceNegotiable ?? true,
    category: d.category,
    propertyType: d.propertyType,
    size: d.size,
    sizeUnit: unit,
    condition,
    amenities: normalizeAmenities(
      d.amenities && d.amenities.length
        ? d.amenities
        : isPlot
          ? ['Boundary wall', 'Electricity', 'Gas', 'Water', 'Sewerage']
          : ['Parking', 'Security'],
    ),
    securityDeposit: d.deposit ?? d.securityDeposit ?? 0,
    advanceRent: isRent ? d.advanceRent ?? d.price ?? null : null,
    leaseTerm: d.leaseTerm || 12,
    furnished: d.furnished || 'unfurnished',
    availableFrom: isRent
      ? d.availableFrom || new Date(Date.now() + 7 * 24 * 3600e3)
      : null,
    contactName: owner.name,
    contactEmail: owner.email,
    contactPhone: owner.phone || '',
    contactWhatsapp: d.contactWhatsapp || owner.phone || '',
    contactAltPhone: d.contactAltPhone || '',
    showWhatsapp: d.showWhatsapp !== false,
    status: d.status || 'active',
    actingRole: actingRole || owner.role || null,
    listedById: owner.id,
    plotDetails: null,
    commercialDetails: null,
  };

  if (createdAt) data.createdAt = createdAt;

  if (isHome) {
    Object.assign(data, {
      bedrooms: bed,
      bathrooms: bath,
      kitchens: d.kitchens ?? 1,
      drawingRooms: d.drawingRooms ?? (bed >= 3 ? 1 : 0),
      diningRooms: d.diningRooms ?? (bed >= 4 ? 1 : 0),
      livingRooms: d.livingRooms ?? 1,
      studyRooms: d.studyRooms ?? 0,
      storeRooms: d.storeRooms ?? (bed >= 3 ? 1 : 0),
      powderRooms: d.powderRooms ?? (bed >= 4 ? 1 : 0),
      servantQuarters: d.servantQuarters ?? (bed >= 5 ? 1 : 0),
      floorNumber: d.floorNumber ?? (isFlat ? 2 + (index % 4) : 0),
      totalFloors: d.totalFloors ?? (isFlat ? 5 + (index % 3) : bed >= 5 ? 2 : 1),
      constructionYear: d.constructionYear ?? 2015 + (index % 8),
      facing: d.facing || facingOptions[index % facingOptions.length],
      buildingName: d.buildingName || (isFlat ? `${d.area} Residences` : null),
      apartmentNumber: d.apartmentNumber || (isFlat ? String(101 + index * 3) : null),
      parkingSpaces: d.parkingSpaces ?? (bed >= 4 ? 2 : 1),
    });
  } else if (isPlot) {
    Object.assign(data, {
      bedrooms: null,
      bathrooms: null,
      plotDetails: d.plotDetails || {
        plotNumber: d.plotNumber || String(100 + index),
        corner: Boolean(d.corner ?? titleLower.includes('corner')),
        parkFacing: Boolean(d.parkFacing),
        mainBoulevard: Boolean(d.mainBoulevard ?? titleLower.includes('boulevard')),
        possession: d.possession || 'ready',
        developmentStatus: d.developmentStatus || 'developed',
        boundaryWall: d.boundaryWall !== false,
        electricity: true,
        gas: true,
        water: true,
        sewerage: true,
      },
    });
  } else if (isCommercial) {
    const isOffice = d.propertyType === 'office';
    Object.assign(data, {
      bedrooms: null,
      bathrooms: bath || 1,
      floorNumber: d.floorNumber ?? 1 + (index % 3),
      totalFloors: d.totalFloors ?? 4 + (index % 4),
      buildingName: d.buildingName || `${d.area} Plaza`,
      parkingSpaces: d.parkingSpaces ?? (isOffice ? 8 : 3),
      commercialDetails: d.commercialDetails || {
        washrooms: bath || 2,
        reception: isOffice || d.propertyType === 'plaza',
        conferenceRoom: isOffice,
        officeRooms: isOffice ? 4 + (index % 4) : 0,
        generator: true,
        elevator: ['office', 'plaza', 'commercial-building', 'building'].includes(
          d.propertyType,
        ),
        frontage: d.frontage || '40 ft',
        mainRoad: true,
        corner: Boolean(d.corner ?? titleLower.includes('corner')),
      },
    });
  }

  return data;
}

module.exports = { toPropertyCreateData, normalizeAmenities };
