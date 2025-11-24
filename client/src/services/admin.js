// client/src/services/admin.js

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

// GET PENDING
export async function getPendingBookings(token) {
  const res = await fetch(`${API}/api/admin/bookings/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch pending bookings");
  return res.json();
}

// APPROVE
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

// REJECT
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

// PROMOTE USER FROM WAITLIST
export async function promoteUser(bookingId, userId, token) {
  const res = await fetch(`${API}/api/admin/bookings/${bookingId}/promote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to promote user");
  }
  return res.json();
}

// ✅ NEW: GET ALL LABS (For Maintenance Management)
export async function getLabs(token) {
    const res = await fetch(`${API}/api/admin/labs`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if(!res.ok) throw new Error("Failed to fetch labs");
    return res.json();
}

// ✅ NEW: DELETE MAINTENANCE BLOCK
export async function deleteMaintenance(labCode, logId, token) {
    const res = await fetch(`${API}/api/admin/labs/maintenance/${labCode}/${logId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
    if(!res.ok) throw new Error("Failed to remove maintenance");
    return res.json();
}