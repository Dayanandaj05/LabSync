import React, { useState } from "react";

export default function BookingModal({ slot, onClose, onSubmit }) {
  const [purpose, setPurpose] = useState("");

  // ✅ FIX: Define userString explicitly before checking it
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  // 1. Redirect to Login if no user found
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow text-center">
          <p className="text-red-600 font-bold mb-4">You must be logged in to book.</p>
          <button 
            onClick={() => window.location.href='/login'} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!slot) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      labCode: slot.labCode,
      date: slot.date,
      period: slot.period,
      purpose,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-96">
        <h2 className="text-xl font-bold mb-2">Book Lab Slot</h2>
        <p className="text-gray-600 mb-4">
          {slot.labName} — Period {slot.period}
          <br />
          <span className="text-sm text-gray-400">{slot.date}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* READ-ONLY FIELDS */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" disabled value={user.name} className="w-full p-2 border rounded bg-gray-100" />
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-700">Role</label>
             <input type="text" disabled value={user.role} className="w-full p-2 border rounded bg-gray-100" />
          </div>

          {/* PURPOSE SELECTION */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Purpose</label>
            <select
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a reason...</option>
              {user.role === "Staff" ? (
                <>
                  <option value="Extra Class">Extra Class</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Maintenance">Maintenance</option>
                </>
              ) : (
                <>
                  <option value="Project Work">Project Work 💻</option>
                  <option value="Study Session">Study Session 📚</option>
                  <option value="Placement Prep">Placement Prep 💼</option>
                </>
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}