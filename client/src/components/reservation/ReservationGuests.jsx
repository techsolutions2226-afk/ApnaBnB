import { useState } from "react";
import GuestRow from "../navbar/GuestRow";

/* ─── Guest dropdown for the reservation card ─── */
const ReservationGuests = ({ maxGuests, onGuestsChange, onClose }) => {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

  const totalGuests = adults + children;

  const update = (newAdults, newChildren, newInfants, newPets) => {
    setAdults(newAdults);
    setChildren(newChildren);
    setInfants(newInfants);
    setPets(newPets);
    /* Build summary string and pass up */
    const parts = [];
    const g = newAdults + newChildren;
    if (g > 0) parts.push(`${g} guest${g !== 1 ? "s" : ""}`);
    if (newInfants > 0) parts.push(`${newInfants} infant${newInfants !== 1 ? "s" : ""}`);
    if (newPets > 0) parts.push(`${newPets} pet${newPets !== 1 ? "s" : ""}`);
    onGuestsChange({
      adults: newAdults,
      children: newChildren,
      infants: newInfants,
      pets: newPets,
      total: g,
      summary: parts.join(", ") || "1 guest",
    });
  };

  return (
    <div className="rv-guests-dropdown">
      <GuestRow
        label="Adults"
        sublabel="Age 13+"
        count={adults}
        minVal={1}
        onInc={() => totalGuests < maxGuests && update(adults + 1, children, infants, pets)}
        onDec={() => update(adults - 1, children, infants, pets)}
      />
      <div className="rv-guests-divider" />
      <GuestRow
        label="Children"
        sublabel="Ages 2–12"
        count={children}
        onInc={() => totalGuests < maxGuests && update(adults, children + 1, infants, pets)}
        onDec={() => update(adults, children - 1, infants, pets)}
      />
      <div className="rv-guests-divider" />
      <GuestRow
        label="Infants"
        sublabel="Under 2"
        count={infants}
        onInc={() => infants < 5 && update(adults, children, infants + 1, pets)}
        onDec={() => update(adults, children, infants - 1, pets)}
      />
      <div className="rv-guests-divider" />
      <GuestRow
        label="Pets"
        sublabel="Bringing a service animal?"
        count={pets}
        onInc={() => pets < 5 && update(adults, children, infants, pets + 1)}
        onDec={() => update(adults, children, infants, pets - 1)}
        link="Bringing a service animal?"
      />
      <p className="rv-guests-note">
        This place has a maximum of {maxGuests} guests, not including infants.
      </p>
      <div className="rv-guests-footer">
        <button className="rv-guests-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ReservationGuests;
