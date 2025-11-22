import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API, { createBooking, getLogs } from "../services/api.js";
import TimetableGrid from "../components/TimetableGrid.jsx";
import BookingModal from "../components/BookingModal.jsx";
import LogsViewer from "../components/LogsViewer.jsx"; 
import LogoutButton from "../components/LogoutButton.jsx";
import DateSelector from "../components/DateSelector.jsx"; 

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(initialDate);

  const [gridData, setGridData] = useState({ labs: [], schedule: {} });
  const [logs, setLogs] = useState([]); 
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  // ✅ CHECK IF DATE IS IN PAST
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = date < todayStr;

  const loadData = async (isBackground = false) => {
    if (!isBackground) setIsInitialLoading(true); else setIsSyncing(true);
    try {
      const { data } = await API.get(`/api/public/grid-data?date=${date}`);
      const scheduleMap = {};
      if (data.bookings) {
        data.bookings.forEach((b) => {
          if (!scheduleMap[b.labCode]) scheduleMap[b.labCode] = {};
          scheduleMap[b.labCode][b.period] = b;
        });
      }
      setGridData({ labs: data.labs || [], schedule: scheduleMap });
      const logsData = await getLogs(50); 
      setLogs(logsData.logs || []);
    } catch (err) { console.error(err); } finally { setIsInitialLoading(false); setIsSyncing(false); }
  };

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(true), 10000); 
    return () => clearInterval(interval);
  }, [date]);

  const handleSlotClick = (lab, period, existingBooking = null) => {
    // ✅ STRICT BLOCK FOR PAST DATES
    if (isPast) return;

    if (!user) {
      if (confirm("You must be logged in to book a slot. Go to login?")) navigate("/login");
      return;
    }
    if (existingBooking && user.role !== 'Admin') return;

    setSelectedSlot({ labCode: lab.code, labName: lab.name, date, period, existingBooking });
  };

  const handleBookingSubmit = async (payload) => {
    try {
      const token = localStorage.getItem("token");
      const res = await createBooking(payload, token);
      alert(res.data?.message || "Request processed.");
      setSelectedSlot(null);
      loadData(true); 
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed");
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
        <div className="w-full lg:flex-1">
          <div className="flex justify-between items-center mb-2 px-1">
            <h2 className="font-bold text-2xl text-slate-800 flex items-center gap-2">
              Lab Schedule
              {isSyncing && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
            </h2>
            
            <div className="flex gap-2 items-center">
              {user?.role === 'Admin' && <a href="/admin" className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800">Dashboard</a>}
              {user ? (
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                   <span className="text-xs font-bold text-slate-700 hidden sm:inline">{user.name}</span>
                   <LogoutButton />
                </div>
              ) : (
                <button onClick={() => navigate("/login")} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Login</button>
              )}
            </div>
          </div>

          <DateSelector selectedDate={date} onSelect={setDate} />
        </div>
      </div>

      <div className="hidden lg:flex gap-4 text-xs justify-start px-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Free</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span> Pending</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span> Student</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></span> Staff</span>
          <span className="flex items-center gap-1 ml-4 text-indigo-600 font-bold"><span className="w-3 h-3 border-2 border-indigo-500 rounded"></span> Your Booking</span>
      </div>

      <div className="relative min-h-[300px]">
        {isInitialLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl"><div className="text-gray-500 text-sm animate-pulse font-semibold">Loading Schedule...</div></div>}
        
        {/* ✅ Pass isReadOnly (isPast) to Grid */}
        <TimetableGrid 
          gridData={gridData} 
          onSlotClick={handleSlotClick} 
          currentUser={user} 
          isReadOnly={isPast} 
        />
      </div>

      <LogsViewer logs={logs} />

      {selectedSlot && <BookingModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} onSubmit={handleBookingSubmit} />}
    </div>
  );
}