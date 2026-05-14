// Score a property↔requirement pair on a 0-100 scale. Shared by
// propertyController, requirementController, and matchController so the
// auto-generated matches and the manual-match preview use identical scoring.
//
// Weights:
//   budget    40   (or 25 if price is within 10% above max)
//   area      20   (exact) or 10 (substring)
//   bedrooms  20   (or 10 if off by 1)
//   bathrooms 10   (or  5 if off by 1)
//   size      10   (matchController only; ignored if either side missing)

const calculateMatchScore = (property, requirement) => {
  let score = 0;

  // Budget
  const min = requirement.budget?.min || 0;
  const max = requirement.budget?.max || Infinity;
  if (property.price >= min && property.price <= max) {
    score += 40;
  } else if (property.price <= max * 1.1) {
    score += 25;
  }

  // Area
  if (property.location?.area && requirement.location?.area) {
    if (property.location.area === requirement.location.area) {
      score += 20;
    } else if (
      property.location.area.includes(requirement.location.area) ||
      requirement.location.area.includes(property.location.area)
    ) {
      score += 10;
    }
  }

  // Bedrooms
  if (!requirement.bedrooms || property.bedrooms === requirement.bedrooms) {
    score += 20;
  } else if (Math.abs(property.bedrooms - requirement.bedrooms) === 1) {
    score += 10;
  }

  // Bathrooms
  if (!requirement.bathrooms || property.bathrooms === requirement.bathrooms) {
    score += 10;
  } else if (Math.abs(property.bathrooms - requirement.bathrooms) === 1) {
    score += 5;
  }

  // Size (optional — both sides numeric)
  if (typeof property.size === 'number' && typeof requirement.size === 'number' && requirement.size > 0) {
    const sizeDiff = Math.abs(property.size - requirement.size) / requirement.size;
    if (sizeDiff <= 0.1) {
      score += 10;
    } else if (sizeDiff <= 0.2) {
      score += 5;
    }
  }

  return Math.min(score, 100);
};

module.exports = { calculateMatchScore };
