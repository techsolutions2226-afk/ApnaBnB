import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import tripService from "../services/tripService";
import { useAuth } from "./AuthContext";

const BookingContext = createContext(null);

// Normalize a backend trip document to the shape the UI expects.
// Old code referenced `trip.id` and `trip.propertyId` — we map both off the
// Mongo `_id` and the populated `property` object.
const normalizeTrip = (t) => ({
  id: t._id || t.id,
  propertyId:
    (t.property && (t.property._id || t.property.id)) || t.property,
  property: typeof t.property === "object" ? t.property : null,
  userId: t.user,
  checkIn: t.checkIn,
  checkOut: t.checkOut,
  nights: t.nights,
  guests: t.guests || { adults: 0, children: 0, infants: 0 },
  totalPrice: t.totalPrice,
  serviceFee: t.serviceFee || 0,
  status: t.status,
  confirmationCode: t.confirmationCode,
  bookedAt: t.createdAt ? t.createdAt.split("T")[0] : null,
  cancelledAt: t.cancelledAt || null,
  refundAmount: t.refundAmount || null,
  role: t.role || null,
  visitorProposal: t.visitorProposal || null,
  ownerProposal: t.ownerProposal || null,
  visitorConfirmed: !!t.visitorConfirmed,
  ownerConfirmed: !!t.ownerConfirmed,
  confirmedAt: t.confirmedAt || null,
  scheduleState: t.scheduleState || "pending",
  checkInCode: t.checkInCode || null,
  checkInCodeUsed: !!t.checkInCodeUsed,
  checkedInAt: t.checkedInAt || null,
  completedAt: t.completedAt || null,
  completedById: t.completedById || null,
  outcome: t.outcome || "pending",
  effectiveOutcome: t.effectiveOutcome || t.outcome || "pending",
});

export function BookingProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setTrips([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await tripService.getMine();
      setTrips(data.map(normalizeTrip));
    } catch (err) {
      setError(err.message || "Failed to load trips");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTrip = useCallback(async (tripData) => {
    const payload = {
      propertyId: tripData.propertyId,
      checkIn: tripData.checkIn,
      checkOut: tripData.checkOut,
      nights: tripData.nights,
      guests: tripData.guests,
      totalPrice: tripData.totalPrice,
      serviceFee: tripData.serviceFee || 0,
      visitorProposal: tripData.visitorProposal || null,
    };
    const created = await tripService.create(payload);
    const normalized = normalizeTrip(created);
    setTrips((prev) => [normalized, ...prev]);
    return normalized;
  }, []);

  const cancelTrip = useCallback(async (tripId) => {
    const updated = await tripService.cancel(tripId);
    const normalized = normalizeTrip(updated);
    setTrips((prev) => prev.map((t) => (t.id === tripId ? normalized : t)));
    return normalized;
  }, []);

  const proposeSchedule = useCallback(
    async (tripId, proposal) => {
      const updated = await tripService.proposeSchedule(tripId, proposal);
      const normalized = normalizeTrip(updated);
      setTrips((prev) => prev.map((t) => (t.id === tripId ? normalized : t)));
      return normalized;
    },
    []
  );

  const confirmVisit = useCallback(async (tripId) => {
    const updated = await tripService.confirm(tripId);
    const normalized = normalizeTrip(updated);
    setTrips((prev) => prev.map((t) => (t.id === tripId ? normalized : t)));
    return normalized;
  }, []);

  const getUserTrips = useCallback(
    (userId) => trips.filter((t) => !userId || t.userId === userId || t.userId?.toString?.() === userId),
    [trips]
  );

  const getUpcoming = useCallback(
    () =>
      trips.filter(
        (t) => t.status === "upcoming" || t.status === "checked_in"
      ),
    [trips]
  );

  const getCompleted = useCallback(
    () => trips.filter((t) => t.status === "completed"),
    [trips]
  );

  /* Visit outcome records — successful vs unsuccessful, both sides included
     (visits proposed + visits on my listings). */
  const getVisitCounts = useCallback(() => {
    const successful = trips.filter(
      (t) => (t.effectiveOutcome || t.outcome) === "success"
    ).length;
    const unsuccessful = trips.filter((t) => {
      const o = t.effectiveOutcome || t.outcome;
      return o === "cancelled" || o === "no_show";
    }).length;
    return { successful, unsuccessful };
  }, [trips]);

  const getCancelled = useCallback(
    () => trips.filter((t) => t.status === "cancelled"),
    [trips]
  );

  const getTripById = useCallback(
    (id) => trips.find((t) => t.id === id) || null,
    [trips]
  );

  return (
    <BookingContext.Provider
      value={{
        trips,
        isLoading,
        error,
        refresh,
        addTrip,
        cancelTrip,
        proposeSchedule,
        confirmVisit,
        getUserTrips,
        getUpcoming,
        getCompleted,
        getCancelled,
        getVisitCounts,
        getTripById,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}

export default BookingContext;
