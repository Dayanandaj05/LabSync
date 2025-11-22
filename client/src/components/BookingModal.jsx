import React, { useState } from "react";
import API from "../services/api";

export default function BookingModal({ slot, onClose, onSubmit }) {
  const [purposeType, setPurposeType] = useState(""); 
  const [customPurpose, setCustomPurpose] = useState(""); 

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  if (!user) return null; // Should be handled by Home redirect, but safe check
  if (!slot) return null;

  const isOverrideMode = !!slot.existingBooking; // Check if we are overriding

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalPurpose = purposeType === "Other" ? customPurpose : purposeType;
    if (!finalPurpose.trim()) return alert("Please enter a purpose");

    onSubmit({
      labCode: slot.labCode,
      date: slot.date,
      period: slot.period,
      purpose: finalPurpose,
    });
  };

  const handleCancelBooking = async () => {
    if (!confirm("Are you sure you want to cancel this booking? The user will be notified.")) return;
    try {
      const token = localStorage.getItem("token");
      await API.delete(`/api/admin/bookings/${slot.existingBooking._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Booking cancelled.");
      onClose();
      window.location.reload(); // Simple refresh to update grid
    } catch (err) {
      alert("Failed to cancel: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in scale-100 border-t-4 border-slate-900">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

        <div className="mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {isOverrideMode ? "Manage Slot" : "Book Lab Slot"}
          </h2>
          <p className="text-sm text-blue-600 font-medium mt-1">
            {slot.labName} • <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-700">Period {slot.period}</span> • {slot.date}
          </p>
        </div>

        {/* SHOW EXISTING BOOKING INFO IF OVERRIDING */}
        {isOverrideMode && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
            <h3 className="text-red-700 font-bold text-sm uppercase tracking-wider mb-2">⚠️ Currently Booked By:</h3>
            <div className="text-slate-800 font-medium">{slot.existingBooking.creatorName}</div>
            <div className="text-slate-500 text-xs italic">"{slot.existingBooking.purpose}"</div>
            <div className="text-xs mt-2 text-red-600 font-semibold">Status: {slot.existingBooking.status}</div>
            
            <button 
              type="button" 
              onClick={handleCancelBooking}
              className="mt-3 w-full bg-white border border-red-300 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition"
            >
              CANCEL THIS BOOKING
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* OVERRIDE FORM HEADER */}
          {isOverrideMode && (
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-t pt-4">
              Override with New Booking
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Purpose</label>
            <select required value={purposeType} onChange={(e) => setPurposeType(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">-- Select Reason --</option>
              <option value="Exam">Exam / Test</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Urgent Class">Urgent Class</option>
              <option value="Other">Other...</option>
            </select>
          </div>

          {purposeType === "Other" && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Details</label>
              <input type="text" required value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)} className="w-full p-3 border border-blue-300 bg-blue-50 rounded-xl outline-none" />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-8 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">Close</button>
            <button type="submit" className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg">
              {isOverrideMode ? "Override Booking" : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}