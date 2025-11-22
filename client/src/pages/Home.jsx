import React, { useEffect, useState } from "react";
import API, { createBooking } from "../services/api.js"; // Added .js extension
import TimetableGrid from "../components/TimetableGrid.jsx"; // Added .jsx extension
import BookingModal from "../components/BookingModal.jsx"; // Added .jsx extension
import LogoutButton from "../components/LogoutButton.jsx"; // Added .jsx extension

export default function Home() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gridData, setGridData] = useState({ labs: [], schedule: {} });
  const [selectedSlot, setSelectedSlot] = useState(null); // For Modal
  const [loading, setLoading] = useState(false);

  // ✅ GET USER INFO (For Admin Button Check)
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // 1. Fetch Data & Transform for Grid
  const loadSchedule = async () => {
    setLoading(true);
    try {
      // Call the new backend route
      const { data } = await API.get(`/api/public/grid-data?date=${date}`);
      
      // Transform array of bookings into Object Dictionary: schedule[labCode][period] = booking
      const scheduleMap = {};
      
      if (data.bookings) {
        data.bookings.forEach((b) => {
          if (!scheduleMap[b.labCode]) scheduleMap[b.labCode] = {};
          scheduleMap[b.labCode][b.period] = b;
        });
      }

      setGridData({
        labs: data.labs || [],
        schedule: scheduleMap
      });

    } catch (err) {
      console.error("Failed to load schedule", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [date]);

  // 2. Handle Grid Click
  const handleSlotClick = (lab, period) => {
    setSelectedSlot({
      labCode: lab.code,
      labName: lab.name,
      date,
      period
    });
  };

  // 3. Handle Booking Submission
  const handleBookingSubmit = async (payload) => {
    try {
      const token = localStorage.getItem("token");
      const res = await createBooking(payload, token);
      
      // ✅ Dynamic Message: "Approved" for Admin, "Pending" for others
      alert(res.data?.message || "Request processed.");
      
      setSelectedSlot(null);
      loadSchedule(); // Refresh grid
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
        
        {/* Left: Date Picker */}
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg text-gray-800">Lab Schedule</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Right: Buttons & Legend */}
        <div className="flex gap-4 items-center mt-4 md:mt-0">
           
           {/* ✅ ADMIN DASHBOARD BUTTON (Only for Admins) */}
           {user.role === 'Admin' && (
             <a 
               href="/admin" 
               className="bg-black text-white px-4 py-2 rounded text-sm font-bold hover:bg-gray-800 transition shadow-md"
             >
               Go to Dashboard
             </a>
           )}

           {/* Key / Legend */}
           <div className="hidden lg:flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Free</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span> Pending</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span> Student</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></span> Staff</span>
           </div>
           
           <LogoutButton />
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading schedule...</div>
      ) : (
        <TimetableGrid gridData={gridData} onSlotClick={handleSlotClick} />
      )}

      {/* Modal */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSubmit={handleBookingSubmit}
        />
      )}
    </div>
  );
}