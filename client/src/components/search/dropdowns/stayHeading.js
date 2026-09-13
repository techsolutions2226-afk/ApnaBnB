/* ─── Title + subtitle guiding each step of the Tenant "When" panel. ─── */

import { fromDateKey, formatDateLong } from "../../../utils/dateRange";
import {
  getStayPeriod,
  formatStay,
  formatHour,
  formatDuration,
  plural,
  stayHours,
  stayNights,
} from "../../../utils/stay";

export default function stayHeading(stay) {
  const def = getStayPeriod(stay.period);
  if (!def) return ["How long are you staying?", "Choose a rental period to see its picker"];

  if (!def.dates) {
    return stay.duration
      ? ["Your stay", `You want this home for ${formatDuration(stay.period, stay.duration)}`]
      : [`How many ${def.count.unit}s?`, `Pick the number of ${def.count.unit}s you want this home`];
  }

  const start = fromDateKey(stay.checkIn);

  if (def.times === "range") {
    if (!start) return ["Pick a day", "Then tap a start time and an end time"];
    if (stay.startHour == null) return ["Pick a start time", formatDateLong(start)];
    if (stay.endHour == null) return ["Pick an end time", `${formatDateLong(start)} · from ${formatHour(stay.startHour)}`];
    return ["Your booking", `${formatStay(stay)} · ${plural(stayHours(stay), "hour")}`];
  }

  if (def.dates === "range") {
    if (!start) return ["Select check-in date", "Then pick your check-out date"];
    if (!stay.checkOut) {
      return [
        "Select check-out date",
        def.nights
          ? `${formatStay(stay)} · click it again for 1 night`
          : formatStay(stay),
      ];
    }
    const nights = plural(stayNights(stay), "night");
    if (def.times && (stay.startHour == null || stay.endHour == null)) {
      return ["Your dates", `${formatStay(stay)} · ${nights} · add times below (optional)`];
    }
    return ["Your stay", `${formatStay(stay)} · ${nights}`];
  }

  if (!start) return ["Select move-in date", `Then set how many ${def.count.unit}s`];
  return ["Your stay", `${formatDateLong(start)} → ${formatDateLong(fromDateKey(stay.checkOut))}`];
}
