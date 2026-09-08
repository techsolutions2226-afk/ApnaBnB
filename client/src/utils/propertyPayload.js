/**
 * Map ListingForm output ↔ API property payload.
 * Shared by CreateListing, EditListing, and AdminPropertyEditor.
 */

const emptyToUndef = (v) => (v === "" || v == null ? undefined : v);

const numOrUndef = (v) => {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Build location JSON from form fields (matching-safe city/area + extras). */
export const buildLocation = (form) => {
  const city = form.city === "Other" ? form.customCity?.trim() : form.city;
  const area =
    form.city === "Other" || form.area === "Other"
      ? form.customArea?.trim()
      : form.area;

  return {
    city: city || "",
    area: area || "",
    ...(form.locality?.trim() ? { locality: form.locality.trim() } : {}),
    ...(form.block?.trim() ? { block: form.block.trim() } : {}),
    ...(form.street?.trim() ? { street: form.street.trim() } : {}),
    ...(form.landmark?.trim() ? { landmark: form.landmark.trim() } : {}),
    ...(form.coordinates ? { coordinates: form.coordinates } : {}),
  };
};

/** Form → API create/update body. */
export const formToPropertyPayload = (form, extras = {}) => {
  const photos = Array.isArray(form.images)
    ? form.images
        .map((img) => (typeof img === "string" ? img : img?.url))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const payload = {
    title: form.title?.trim(),
    description: form.description?.trim(),
    notes: emptyToUndef(form.notes?.trim()),
    videoUrl: emptyToUndef(form.videoUrl?.trim()),
    purpose: form.purpose || "sale",
    category: form.category || "home",
    propertyType: form.propertyType,
    price: numOrUndef(form.price),
    priceNegotiable: Boolean(form.priceNegotiable),
    size: numOrUndef(form.size),
    sizeUnit: form.sizeUnit || "Marla",
    condition: emptyToUndef(form.condition),
    location: buildLocation(form),
    bedrooms: numOrUndef(form.bedrooms),
    bathrooms: numOrUndef(form.bathrooms),
    kitchens: numOrUndef(form.kitchens),
    drawingRooms: numOrUndef(form.drawingRooms),
    diningRooms: numOrUndef(form.diningRooms),
    livingRooms: numOrUndef(form.livingRooms),
    studyRooms: numOrUndef(form.studyRooms),
    storeRooms: numOrUndef(form.storeRooms),
    powderRooms: numOrUndef(form.powderRooms),
    servantQuarters: numOrUndef(form.servantQuarters),
    floorNumber: numOrUndef(form.floorNumber),
    totalFloors: numOrUndef(form.totalFloors),
    constructionYear: numOrUndef(form.constructionYear),
    facing: emptyToUndef(form.facing),
    buildingName: emptyToUndef(form.buildingName?.trim()),
    apartmentNumber: emptyToUndef(form.apartmentNumber?.trim()),
    parkingSpaces: numOrUndef(form.parkingSpaces),
    amenities: Array.isArray(form.amenities) ? form.amenities : [],
    photos,
    securityDeposit: numOrUndef(form.securityDeposit) ?? 0,
    advanceRent: numOrUndef(form.advanceRent),
    leaseTerm: numOrUndef(form.leaseTerm) ?? 12,
    furnished: form.furnished || "unfurnished",
    availableFrom: emptyToUndef(form.availableFrom),
    contactName: form.contactName?.trim() || "",
    contactEmail: form.contactEmail?.trim() || "",
    contactPhone: form.contactPhone?.trim() || "",
    contactWhatsapp: form.contactWhatsapp?.trim() || "",
    contactAltPhone: form.contactAltPhone?.trim() || "",
    showWhatsapp: form.showWhatsapp !== false,
    plotDetails:
      form.category === "plot"
        ? {
            plotNumber: form.plotNumber || "",
            corner: Boolean(form.plotCorner),
            parkFacing: Boolean(form.plotParkFacing),
            mainBoulevard: Boolean(form.plotMainBoulevard),
            possession: form.plotPossession || "",
            developmentStatus: form.plotDevelopment || "",
            boundaryWall: Boolean(form.plotBoundaryWall),
            electricity: Boolean(form.plotElectricity),
            gas: Boolean(form.plotGas),
            water: Boolean(form.plotWater),
            sewerage: Boolean(form.plotSewerage),
          }
        : null,
    commercialDetails:
      form.category === "commercial"
        ? {
            washrooms: numOrUndef(form.commWashrooms),
            reception: Boolean(form.commReception),
            conferenceRoom: Boolean(form.commConference),
            officeRooms: numOrUndef(form.commOfficeRooms),
            generator: Boolean(form.commGenerator),
            elevator: Boolean(form.commElevator),
            frontage: form.commFrontage || "",
            mainRoad: Boolean(form.commMainRoad),
            corner: Boolean(form.commCorner),
          }
        : null,
    ...extras,
  };

  return payload;
};

/** Flatten property API record into ListingForm initialData shape. */
export const propertyToFormInitial = (p = {}) => {
  const loc = p.location || {};
  const plot = p.plotDetails && typeof p.plotDetails === "object" ? p.plotDetails : {};
  const comm =
    p.commercialDetails && typeof p.commercialDetails === "object"
      ? p.commercialDetails
      : {};

  return {
    title: p.title || "",
    purpose: p.purpose || "sale",
    category: p.category || "home",
    propertyType: p.propertyType || "",
    price: p.price != null ? String(p.price) : "",
    priceNegotiable: Boolean(p.priceNegotiable),
    size: p.size != null ? String(p.size) : "",
    sizeUnit: p.sizeUnit || "Marla",
    condition: p.condition || "",
    city: loc.city || p.city || "",
    area: loc.area || p.area || "",
    locality: loc.locality || "",
    block: loc.block || "",
    street: loc.street || "",
    landmark: loc.landmark || "",
    coordinates: loc.coordinates || p.coordinates || null,
    location: loc,
    bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
    bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
    kitchens: p.kitchens != null ? String(p.kitchens) : "",
    drawingRooms: p.drawingRooms != null ? String(p.drawingRooms) : "",
    diningRooms: p.diningRooms != null ? String(p.diningRooms) : "",
    livingRooms: p.livingRooms != null ? String(p.livingRooms) : "",
    studyRooms: p.studyRooms != null ? String(p.studyRooms) : "",
    storeRooms: p.storeRooms != null ? String(p.storeRooms) : "",
    powderRooms: p.powderRooms != null ? String(p.powderRooms) : "",
    servantQuarters: p.servantQuarters != null ? String(p.servantQuarters) : "",
    floorNumber: p.floorNumber != null ? String(p.floorNumber) : "",
    totalFloors: p.totalFloors != null ? String(p.totalFloors) : "",
    constructionYear: p.constructionYear != null ? String(p.constructionYear) : "",
    facing: p.facing || "",
    buildingName: p.buildingName || "",
    apartmentNumber: p.apartmentNumber || "",
    parkingSpaces: p.parkingSpaces != null ? String(p.parkingSpaces) : "",
    description: p.description || "",
    notes: p.notes || "",
    videoUrl: p.videoUrl || "",
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    gallery: Array.isArray(p.photos) ? p.photos : [],
    securityDeposit: p.securityDeposit != null ? String(p.securityDeposit) : "",
    advanceRent: p.advanceRent != null ? String(p.advanceRent) : "",
    leaseTerm: p.leaseTerm || 12,
    furnished: p.furnished || "unfurnished",
    availableFrom: p.availableFrom
      ? new Date(p.availableFrom).toISOString().slice(0, 10)
      : "",
    contactName: p.contactName || "",
    contactEmail: p.contactEmail || "",
    contactPhone: p.contactPhone || "",
    contactWhatsapp: p.contactWhatsapp || "",
    contactAltPhone: p.contactAltPhone || "",
    showWhatsapp: p.showWhatsapp !== false,
    plotNumber: plot.plotNumber || "",
    plotCorner: Boolean(plot.corner),
    plotParkFacing: Boolean(plot.parkFacing),
    plotMainBoulevard: Boolean(plot.mainBoulevard),
    plotPossession: plot.possession || "",
    plotDevelopment: plot.developmentStatus || "",
    plotBoundaryWall: Boolean(plot.boundaryWall),
    plotElectricity: Boolean(plot.electricity),
    plotGas: Boolean(plot.gas),
    plotWater: Boolean(plot.water),
    plotSewerage: Boolean(plot.sewerage),
    commWashrooms: comm.washrooms != null ? String(comm.washrooms) : "",
    commReception: Boolean(comm.reception),
    commConference: Boolean(comm.conferenceRoom),
    commOfficeRooms: comm.officeRooms != null ? String(comm.officeRooms) : "",
    commGenerator: Boolean(comm.generator),
    commElevator: Boolean(comm.elevator),
    commFrontage: comm.frontage || "",
    commMainRoad: Boolean(comm.mainRoad),
    commCorner: Boolean(comm.corner),
  };
};
