/**
 * Build dynamic overview rows for property detail views.
 * Only includes fields that have values and fit the category/purpose.
 */

import { formatPrice, formatDate } from "./formatters";

const capitalize = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/-/g, " ") : "";

const CONDITION_LABELS = {
  "brand-new": "Brand New",
  "like-new": "Like New",
  good: "Good",
  "needs-renovation": "Needs Renovation",
  "under-construction": "Under Construction",
};

const row = (label, value) =>
  value != null && value !== "" ? { label, value: String(value) } : null;

const yesNo = (v) => (v ? "Yes" : null);

const countRow = (label, n) =>
  n != null && Number(n) > 0 ? { label, value: String(n) } : null;

/** Full location line including optional locality/block/street/landmark. */
export const formatPropertyLocation = (location) => {
  if (!location || typeof location !== "object") {
    return typeof location === "string" ? location : "";
  }
  return [location.landmark, location.street, location.block, location.locality, location.area, location.city]
    .filter(Boolean)
    .join(", ");
};

/**
 * @param {object} property
 * @returns {{ label: string, value: string }[]}
 */
export const buildPropertyOverviewRows = (property = {}) => {
  const {
    propertyType,
    purpose,
    price,
    priceNegotiable,
    size,
    sizeUnit,
    bedrooms,
    bathrooms,
    kitchens,
    drawingRooms,
    diningRooms,
    livingRooms,
    studyRooms,
    storeRooms,
    powderRooms,
    servantQuarters,
    floorNumber,
    totalFloors,
    constructionYear,
    facing,
    buildingName,
    apartmentNumber,
    parkingSpaces,
    condition,
    furnished,
    category,
    location,
    createdAt,
    securityDeposit,
    advanceRent,
    leaseTerm,
    availableFrom,
    plotDetails,
    commercialDetails,
  } = property;

  const loc =
    location && typeof location === "object"
      ? location
      : { city: property.city, area: property.area };
  const locationString = formatPropertyLocation(loc) ||
    [loc.area, loc.city].filter(Boolean).join(", ");

  const plot = plotDetails && typeof plotDetails === "object" ? plotDetails : {};
  const comm =
    commercialDetails && typeof commercialDetails === "object"
      ? commercialDetails
      : {};

  const isRent = purpose === "rent";
  const isHome = category === "home" || (!category && !["plot", "commercial"].includes(category));
  const isPlot = category === "plot";
  const isCommercial = category === "commercial";
  const isFlat = String(propertyType || "").toLowerCase() === "flat";

  const rows = [
    row("Type", capitalize(propertyType)),
    row("Category", capitalize(category)),
    row("Purpose", purpose === "rent" ? "For Rent" : purpose === "sale" ? "For Sale" : capitalize(purpose)),
    price != null
      ? {
          label: isRent ? "Monthly Rent" : "Price",
          value: `${formatPrice(price, { prefix: true })}${priceNegotiable ? " (Negotiable)" : ""}`,
        }
      : null,
    size ? row("Size", `${size} ${sizeUnit || ""}`.trim()) : null,
    row("Condition", CONDITION_LABELS[condition] || capitalize(condition)),
    locationString ? row("Location", locationString) : null,
    loc.locality ? row("Locality", loc.locality) : null,
    loc.block ? row("Block", loc.block) : null,
    loc.street ? row("Street", loc.street) : null,
    loc.landmark ? row("Landmark", loc.landmark) : null,
  ];

  if (isRent) {
    rows.push(
      securityDeposit > 0
        ? row("Security Deposit", formatPrice(securityDeposit, { prefix: true }))
        : null,
      advanceRent > 0
        ? row("Advance Rent", formatPrice(advanceRent, { prefix: true }))
        : null,
      leaseTerm ? row("Min. Rental Period", `${leaseTerm} month${leaseTerm !== 1 ? "s" : ""}`) : null,
      availableFrom ? row("Available From", formatDate(availableFrom)) : null,
    );
  }

  if (isHome || isFlat) {
    rows.push(
      countRow("Bedrooms", bedrooms),
      countRow("Bathrooms", bathrooms),
      countRow("Kitchens", kitchens),
      countRow("Drawing Rooms", drawingRooms),
      countRow("Dining Rooms", diningRooms),
      countRow("Living Rooms", livingRooms),
      countRow("Study Rooms", studyRooms),
      countRow("Store Rooms", storeRooms),
      countRow("Powder Rooms", powderRooms),
      countRow("Servant Quarters", servantQuarters),
      floorNumber != null ? row("Floor", String(floorNumber)) : null,
      totalFloors != null ? row("Total Floors", String(totalFloors)) : null,
      constructionYear ? row("Construction Year", String(constructionYear)) : null,
      row("Facing", capitalize(facing)),
      row("Building Name", buildingName),
      row("Apartment No.", apartmentNumber),
      countRow("Parking Spaces", parkingSpaces),
      furnished
        ? row(
            "Furnishing",
            furnished === "semi-furnished"
              ? "Semi-Furnished"
              : capitalize(furnished),
          )
        : null,
    );
  }

  if (isPlot) {
    rows.push(
      row("Plot Number", plot.plotNumber),
      yesNo(plot.corner) ? row("Corner", "Yes") : null,
      yesNo(plot.parkFacing) ? row("Park Facing", "Yes") : null,
      yesNo(plot.mainBoulevard) ? row("Main Boulevard", "Yes") : null,
      row("Possession", capitalize(plot.possession)),
      row("Development", capitalize(plot.developmentStatus)),
      yesNo(plot.boundaryWall) ? row("Boundary Wall", "Yes") : null,
      yesNo(plot.electricity) ? row("Electricity", "Yes") : null,
      yesNo(plot.gas) ? row("Gas", "Yes") : null,
      yesNo(plot.water) ? row("Water", "Yes") : null,
      yesNo(plot.sewerage) ? row("Sewerage", "Yes") : null,
    );
  }

  if (isCommercial) {
    rows.push(
      floorNumber != null ? row("Floor", String(floorNumber)) : null,
      totalFloors != null ? row("Total Floors", String(totalFloors)) : null,
      countRow("Parking Spaces", parkingSpaces),
      countRow("Washrooms", comm.washrooms),
      yesNo(comm.reception) ? row("Reception", "Yes") : null,
      yesNo(comm.conferenceRoom) ? row("Conference Room", "Yes") : null,
      countRow("Office Rooms", comm.officeRooms),
      furnished
        ? row(
            "Furnishing",
            furnished === "semi-furnished"
              ? "Semi-Furnished"
              : capitalize(furnished),
          )
        : null,
      yesNo(comm.generator) ? row("Generator", "Yes") : null,
      yesNo(comm.elevator) ? row("Elevator", "Yes") : null,
      row("Building Name", buildingName),
      row("Frontage", capitalize(comm.frontage)),
      yesNo(comm.mainRoad) ? row("Main Road", "Yes") : null,
      yesNo(comm.corner) ? row("Corner Property", "Yes") : null,
    );
  }

  rows.push(createdAt ? row("Added", formatDate(createdAt)) : null);

  return rows.filter(Boolean);
};

/** Contact rows for owner/admin views (respects showWhatsapp). */
export const buildContactRows = (property = {}) => {
  const rows = [
    row("Contact Name", property.contactName),
    row("Email", property.contactEmail),
    row("Mobile", property.contactPhone),
    property.showWhatsapp !== false
      ? row("WhatsApp", property.contactWhatsapp || property.contactPhone)
      : null,
    row("Alternate Phone", property.contactAltPhone),
  ];
  return rows.filter(Boolean);
};
