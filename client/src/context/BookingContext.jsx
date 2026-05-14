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

  const getUserTrips = useCallback(
    (userId) => trips.filter((t) => !userId || t.userId === userId || t.userId?.toString?.() === userId),
    [trips]
  );

  const getUpcoming = useCallback(
    () => trips.filter((t) => t.status === "upcoming"),
    [trips]
  );

  const getCompleted = useCallback(
    () => trips.filter((t) => t.status === "completed"),
    [trips]
  );

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
        getUserTrips,
        getUpcoming,
        getCompleted,
        getCancelled,
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
