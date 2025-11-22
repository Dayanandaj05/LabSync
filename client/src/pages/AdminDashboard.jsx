import React, { useEffect, useState } from "react";
import API from "../services/api"; // Removing extension for cleaner import

export default function AdminDashboard() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [token] = useState(localStorage.getItem("token") || "");

  // 1. Fetch Data on Load
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        // Fetch Bookings
        const bookingsRes = await API.get("/api/admin/bookings/pending", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch Users
        const usersRes = await API.get("/api/admin/users/pending", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPendingBookings(bookingsRes.data.pending || []);
        setPendingUsers(usersRes.data.pending || []);
      } catch (err) {
        console.error("ADMIN DASHBOARD ERROR:", err);
      }
    };

    fetchData();
  }, [token]);

  // 2. Booking Actions
  const handleBookingAction = async (id, action) => { // action = 'approve' or 'reject'
    try {
      if (action === 'reject') {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        await API.put(`/api/admin/bookings/${id}/reject`, { reason }, {
             headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await API.put(`/api/admin/bookings/${id}/approve`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
      }
      // Remove from UI immediately
      setPendingBookings((prev) => prev.filter((b) => b._id !== id));
      alert(`Booking ${action}ed!`);
    } catch (err) {
      alert("Action failed: " + (err.response?.data?.error || err.message));
    }
  };

  // 3. User Actions
  const handleUserAction = async (id, action) => {
    try {
      if (action === 'reject') {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        await API.put(`/api/admin/users/${id}/reject`, { reason }, {
            headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await API.put(`/api/admin/users/${id}/approve`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
      }
      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
      alert(`User ${action}ed!`);
    } catch (err) {
       alert("Action failed: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>

      {/* --- SECTION 1: USERS --- */}
      <section className="mb-10 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-blue-600 border-b pb-2">Pending User Approvals</h2>
        {pendingUsers.length === 0 ? (
          <p className="text-gray-500 italic">No new users to approve.</p>
        ) : (
          <ul className="space-y-4">
            {pendingUsers.map((u) => (
              <li key={u._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-md">
                <div>
                  <p className="font-bold text-lg">{u.name}</p>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  <span className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded mt-1">
                    Role: {u.role}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 sm:mt-0">
                  <button onClick={() => handleUserAction(u._id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition">Approve</button>
                  <button onClick={() => handleUserAction(u._id, 'reject')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- SECTION 2: BOOKINGS --- */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-purple-600 border-b pb-2">Pending Booking Requests</h2>
        {pendingBookings.length === 0 ? (
          <p className="text-gray-500 italic">No pending bookings.</p>
        ) : (
          <ul className="space-y-4">
            {pendingBookings.map((b) => (
              <li key={b._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-md border-l-4 border-yellow-400">
                <div className="mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{b.creatorName}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{b.role}</span>
                  </div>
                  <p className="text-gray-700">
                    Requested <strong>Lab {b.labCode || 'Unknown'}</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Date: {b.date} &bull; Period: {b.period}
                  </p>
                  <p className="text-sm font-medium mt-1 text-gray-800">
                    Purpose: "{b.purpose}"
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => handleBookingAction(b._id, 'approve')} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition">
                    Approve
                  </button>
                  <button onClick={() => handleBookingAction(b._id, 'reject')} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition">
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}