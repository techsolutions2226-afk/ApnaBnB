/* ─── Tenant "When" rental periods ───
   The one definition of the Hourly / Nightly / Monthly / Yearly choice in the
   hero search. Pure data (no icons) so utils/stay.js can be unit-tested.

   duration:  what the − / + stepper counts for that period (null = the
              period picks a check-in/check-out range instead).
   leaseMonths: months per duration step — Monthly/Yearly stays are compared
              against a property's `leaseTerm` (minimum rental period in
              months, Backend/prisma/schema.prisma). Hourly/Nightly have no
              listing data to compare against, so they don't filter. */

export const STAY_PERIODS = [
  {
    id: "hourly",
    label: "Hourly",
    hint: "A few hours",
    duration: { unit: "hour", min: 1, max: 12, default: 2 },
    leaseMonths: null,
  },
  {
    id: "nightly",
    label: "Nightly",
    hint: "Short stays",
    duration: null,
    leaseMonths: null,
  },
  {
    id: "monthly",
    label: "Monthly",
    hint: "1–11 months",
    duration: { unit: "month", min: 1, max: 11, default: 1 },
    leaseMonths: 1,
  },
  {
    id: "yearly",
    label: "Yearly",
    hint: "1–5 years",
    duration: { unit: "year", min: 1, max: 5, default: 1 },
    leaseMonths: 12,
  },
];

/* Hours offered by the Hourly start-time picker (24h). */
export const HOURLY_START_HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM – 11 PM
