import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const bookingsRes = await axios.get(
          "http://localhost:5001/api/admin/bookings/pending",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const usersRes = await axios.get(
          "http://localhost:5001/api/admin/users/pending",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setPendingBookings(bookingsRes.data.pending || []);
        setPendingUsers(usersRes.data.pending || []);
      } catch (err) {
        console.error("ADMIN LOAD ERROR", err);
      }
    };

    fetchData();
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Admin Dashboard</h1>

      {/* USERS */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-2">Pending User Approvals</h2>
        {pendingUsers.length === 0 ? (
          <p className="text-gray-500">No pending users.</p>
        ) : (
          <ul className="space-y-3">
            {pendingUsers.map((u) => (
              <li
                key={u._id}
                className="p-3 bg-gray-100 rounded-md flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">{u.name}</p>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  <p className="text-xs text-gray-400">Role: {u.role}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* BOOKINGS */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Pending Bookings</h2>
        {pendingBookings.length === 0 ? (
          <p className="text-gray-500">No pending bookings.</p>
        ) : (
          <ul className="space-y-3">
            {pendingBookings.map((b) => (
              <li
                key={b._id}
                className="p-3 bg-gray-100 rounded-md flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">
                    {b.creatorName} — {b.purpose}
                  </p>
                  <p className="text-sm text-gray-600">
                    {b.date} — Period {b.period}
                  </p>
                  <p className="text-xs text-gray-400">Role: {b.role}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
