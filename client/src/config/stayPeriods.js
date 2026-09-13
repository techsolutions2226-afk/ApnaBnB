/* ─── Tenant "When" rental periods ───
   The one definition of the Hourly / Nightly / Few nights / Monthly / Yearly
   choice in the hero search. Pure data (no icons) so utils/stay.js can be
   unit-tested.

   dates:  "day"   — one calendar day (move-in / booking day)
           "range" — check-in → check-out days (at least one night)
           null    — no calendar
   times:  "range"      — start → end hour on the same day (Hourly)
           "checkInOut" — check-in hour on the first day, check-out hour
                          on the last day (Few nights)
           null         — no times
   count:  a number the tenant picks — `input` "stepper" (− / +) or
           "chips" (1 2 3 …); `default` 0 means nothing picked yet.
   leaseMonths: months per count step — Monthly/Yearly stays are compared
           against a property's `leaseTerm` (minimum rental period in months,
           Backend/prisma/schema.prisma). Other periods have no listing data
           to compare against, so they don't filter. */

export const STAY_PERIODS = [
  {
    id: "hourly",
    label: "Hourly",
    hint: "A few hours",
    dates: "day",
    times: "range",
    count: null,
    leaseMonths: null,
  },
  {
    id: "nightly",
    label: "Nightly",
    hint: "Pick your dates",
    dates: "range",
    times: null,
    count: null,
    leaseMonths: null,
  },
  {
    id: "few-nights",
    label: "Few nights",
    hint: "Dates + check-in/out times",
    dates: "range",
    times: "checkInOut",
    count: null,
    leaseMonths: null,
  },
  {
    id: "monthly",
    label: "Monthly",
    hint: "1–11 months",
    dates: "day",
    times: null,
    count: { unit: "month", min: 1, max: 11, default: 1, input: "stepper" },
    leaseMonths: 1,
  },
  {
    id: "yearly",
    label: "Yearly",
    hint: "1–5 years",
    dates: null,
    times: null,
    count: { unit: "year", min: 1, max: 5, default: 0, input: "chips" },
    leaseMonths: 12,
  },
];

/* Hour chips (24h). Hourly can end at midnight (24 → "12 AM"). */
export const CHECK_TIME_HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM – 11 PM
export const HOURLY_HOURS = [...CHECK_TIME_HOURS, 24]; // 6 AM – 12 AM
