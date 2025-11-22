import { createContext, useContext, useState } from "react";

const BookingContext = createContext();

export function BookingProvider({ children }) {
  const [pendingBooking, setPendingBooking] = useState(null); // stores lab, period, date

  return (
    <BookingContext.Provider value={{ pendingBooking, setPendingBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookingMemory() {
  return useContext(BookingContext);
}
