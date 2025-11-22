// client/src/services/admin.js

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

// ---------------------------
// GET ALL PENDING BOOKINGS
// ---------------------------
export async function getPendingBookings(token) {
  const res = await fetch(`${API}/api/admin/bookings/pending`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch pending bookings");
  return res.json();
}

// ---------------------------
// APPROVE BOOKING
// ---------------------------
export async function approveBooking(bookingId, token) {
  const res = await fetch(`${API}/api/admin/bookings/${bookingId}/approve`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  });

  if (!res.ok) throw new Error("Failed to approve booking");
  return res.json();
}

// ---------------------------
// REJECT BOOKING
// ---------------------------
export async function rejectBooking(bookingId, reason, token) {
  const res = await fetch(`${API}/api/admin/bookings/${bookingId}/reject`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason })
  });

  if (!res.ok) throw new Error("Failed to reject booking");
  return res.json();
}
