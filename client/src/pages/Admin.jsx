import React, { useEffect, useState } from "react";
import { getPendingBookings, approveBooking, rejectBooking } from "../services/admin";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (!token) return navigate("/login");
    load();
  }, []);

  async function load() {
    try {
      const data = await getPendingBookings(token);
      setPending(data.pending || []);
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function handleApprove(id) {
    await approveBooking(id, token);
    load();
  }

  async function handleReject(id) {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    await rejectBooking(id, reason, token);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Booking Approvals</h1>

      {pending.length === 0 ? (
        <p>No pending bookings.</p>
      ) : (
        <div className="space-y-4">
          {pending.map((b) => (
            <div key={b._id} className="p-4 bg-white rounded shadow">
              <p>
                <strong>{b.creatorName}</strong> requested{" "}
                <strong>Lab {b.lab}</strong> for period {b.period} on{" "}
                {b.date}
              </p>
              <p>Purpose: {b.purpose}</p>

              <div className="mt-4 flex gap-3">
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded"
                  onClick={() => handleApprove(b._id)}
                >
                  Approve
                </button>

                <button
                  className="px-4 py-2 bg-red-600 text-white rounded"
                  onClick={() => handleReject(b._id)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
