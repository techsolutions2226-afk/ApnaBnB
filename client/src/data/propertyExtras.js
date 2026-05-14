/* ─── Extended property data (house rules, cancellation, viewing arrangements) ───
   Separate from properties.js to avoid modifying existing data.
   Lookup by property ID. Only covers real properties (lhr-*, isb-*, khi-*).
   ─────────────────────────────────────────────── */

/* ── Shared rule templates ── */
const STANDARD_RULES = {
  viewingHours: "10:00 AM – 6:00 PM",
  advanceNotice: "24 hours",
  rules: [
    "Valid CNIC/ID required for entry",
    "No photography without permission",
    "Children must be accompanied",
    "Respect current occupants' privacy",
  ],
  safetyItems: [
    "Smoke alarm",
    "Carbon monoxide alarm",
    "Fire extinguisher",
    "First aid kit",
  ],
};

const FLEXIBLE_RULES = {
  ...STANDARD_RULES,
  viewingHours: "9:00 AM – 8:00 PM",
  advanceNotice: "Same day (morning request)",
  rules: [
    "Valid CNIC/ID required for entry",
    "Photography allowed for personal use",
    "Children welcome",
    "Respect current occupants' privacy",
  ],
};

const STRICT_RULES = {
  ...STANDARD_RULES,
  viewingHours: "11:00 AM – 4:00 PM",
  advanceNotice: "48 hours",
  rules: [
    "Valid CNIC/ID required for entry",
    "No photography or video",
    "No unregistered visitors",
    "Shoes off inside the property",
    "Maximum 4 visitors per viewing",
  ],
};

/* ── Verification/documentation templates ── */
const DOCUMENTATION = {
  complete: {
    type: "Complete",
    description:
      "All ownership documents verified. Title deed, NOC, mutation letter, and building approval available for review during visit.",
  },
  partial: {
    type: "Partial",
    description:
      "Title deed and NOC available. Mutation in progress. Full documentation expected within 30 days.",
  },
  verified: {
    type: "Verified",
    description:
      "Third-party verified documentation. All legal clearances obtained. Transfer can be processed immediately.",
  },
};

/* ── Per-property extended data ── */
const propertyExtras = {
  /* ── Lahore ── */
  "lhr-1": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "Master suite", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Double room", count: 1 }] },
      { room: "Bedroom 3", beds: [{ type: "Double room", count: 1 }] },
      { room: "Bedroom 4", beds: [{ type: "Single room", count: 1 }] },
    ],
  },
  "lhr-2": {
    houseRules: STRICT_RULES,
    documentation: DOCUMENTATION.verified,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "Queen bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Single bed", count: 1 }] },
    ],
  },
  "lhr-3": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "Double bed", count: 1 }] },
      {
        room: "Bedroom 2",
        beds: [{ type: "Single bed", count: 2 }],
      },
    ],
  },
  "lhr-4": {
    houseRules: STRICT_RULES,
    documentation: DOCUMENTATION.partial,
    sleepArrangements: [
      { room: "Bedroom", beds: [{ type: "Queen bed", count: 1 }] },
    ],
  },
  "lhr-5": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "Double bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Double bed", count: 1 }] },
    ],
  },
  "lhr-6": {
    houseRules: FLEXIBLE_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "King bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Queen bed", count: 1 }] },
      { room: "Bedroom 3", beds: [{ type: "Single bed", count: 1 }] },
    ],
  },
  "lhr-7": {
    houseRules: FLEXIBLE_RULES,
    documentation: DOCUMENTATION.verified,
    sleepArrangements: [
      { room: "Master Bedroom", beds: [{ type: "King bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Queen bed", count: 1 }] },
      { room: "Bedroom 3", beds: [{ type: "Double bed", count: 1 }] },
      {
        room: "Bedroom 4",
        beds: [{ type: "Single bed", count: 2 }],
      },
    ],
  },

  /* ── Islamabad ── */
  "isb-1": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom", beds: [{ type: "Queen bed", count: 1 }] },
    ],
  },
  "isb-2": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "Double bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Double bed", count: 1 }] },
    ],
  },
  "isb-3": {
    houseRules: STRICT_RULES,
    documentation: DOCUMENTATION.verified,
    sleepArrangements: [
      { room: "Studio", beds: [{ type: "Queen bed", count: 1 }] },
    ],
  },
  "isb-4": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.partial,
    sleepArrangements: [
      { room: "Private Room", beds: [{ type: "Double bed", count: 1 }] },
    ],
  },
  "isb-5": {
    houseRules: STRICT_RULES,
    documentation: DOCUMENTATION.verified,
    sleepArrangements: [
      { room: "Master Suite", beds: [{ type: "King bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Queen bed", count: 1 }] },
      {
        room: "Bedroom 3",
        beds: [{ type: "Single bed", count: 2 }],
      },
    ],
  },
  "isb-6": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      {
        room: "Bedroom",
        beds: [
          { type: "Queen bed", count: 1 },
          { type: "Sofa bed", count: 1 },
        ],
      },
    ],
  },
  "isb-7": {
    houseRules: STRICT_RULES,
    documentation: DOCUMENTATION.verified,
    sleepArrangements: [
      { room: "Suite", beds: [{ type: "King bed", count: 1 }] },
    ],
  },

  /* ── Karachi ── */
  "khi-1": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.verified,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "King bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Queen bed", count: 1 }] },
    ],
  },
  "khi-2": {
    houseRules: FLEXIBLE_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Private Room", beds: [{ type: "Double bed", count: 1 }] },
    ],
  },
  "khi-3": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom", beds: [{ type: "Queen bed", count: 1 }] },
    ],
  },
  "khi-4": {
    houseRules: STANDARD_RULES,
    documentation: DOCUMENTATION.complete,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "Double bed", count: 1 }] },
      {
        room: "Bedroom 2",
        beds: [{ type: "Single bed", count: 2 }],
      },
    ],
  },
  "khi-5": {
    houseRules: STRICT_RULES,
    documentation: DOCUMENTATION.verified,
    sleepArrangements: [
      { room: "Hotel Room", beds: [{ type: "King bed", count: 1 }] },
    ],
  },
  "khi-6": {
    houseRules: FLEXIBLE_RULES,
    documentation: DOCUMENTATION.partial,
    sleepArrangements: [
      { room: "Bedroom 1", beds: [{ type: "Double bed", count: 1 }] },
      { room: "Bedroom 2", beds: [{ type: "Double bed", count: 1 }] },
    ],
  },
};

export const getPropertyExtras = (id) => propertyExtras[id] || null;

export default propertyExtras;
