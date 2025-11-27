import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API, { createBooking, getLogs } from "../services/api.js";
import TimetableGrid from "../components/TimetableGrid.jsx";
import BookingModal from "../components/BookingModal.jsx";
import LogsViewer from "../components/LogsViewer.jsx"; 
import LogoutButton from "../components/LogoutButton.jsx";
import DateSelector from "../components/DateSelector.jsx"; 
import TestCalendarModal from "../components/TestCalendarModal.jsx";
import { getLocalToday } from "../utils/dateHelpers.js";
import { io } from "socket.io-client"; 

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialDate = searchParams.get("date") || getLocalToday();
  const [date, setDate] = useState(initialDate);

  const [gridData, setGridData] = useState({ labs: [], schedule: {} });
  const [logs, setLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false); 
  
  // ✅ MULTI-SELECT STATE
  const [selectedSlots, setSelectedSlots] = useState([]); 
  const [viewingSlot, setViewingSlot] = useState(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const todayStr = getLocalToday();
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
      const annoData = await API.get('/api/public/announcements');
      setAnnouncements(annoData.data.announcements || []);
      const eventsData = await API.get('/api/public/upcoming-tests');
      setEvents(eventsData.data.tests || []);
    } catch (err) { console.error(err); } finally { setIsInitialLoading(false); setIsSyncing(false); }
  };

  useEffect(() => {
    loadData(false);
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5001");
    socket.on("connect", () => console.log("🟢 Socket"));
    socket.on("bookingUpdate", () => loadData(true));
    return () => socket.disconnect();
  }, [date]);

  // HANDLE SLOT CLICK
  const handleSlotClick = (lab, period, existingBooking = null) => {
      if (isPast) return; 
      if (lab.isMaintenance) return alert(`⛔ ${lab.name} is under maintenance.`);
      if (!user) {
        if (confirm("Login required. Go to login?")) navigate("/login");
        return;
      }

      // 1. Occupied Slot -> View Details (No Multi-select)
      if (existingBooking) {
          setViewingSlot({ labCode: lab.code, labName: lab.name, date, period, existingBooking });
          return;
      }

      // 2. Free Slot -> Toggle Selection
      const slotId = `${lab.code}-${period}`;
      const isSelected = selectedSlots.some(s => `${s.labCode}-${s.period}` === slotId);

      if (isSelected) {
          setSelectedSlots(prev => prev.filter(s => `${s.labCode}-${s.period}` !== slotId));
      } else {
          setSelectedSlots(prev => [...prev, { labCode: lab.code, labName: lab.name, date, period }]);
      }
  };

  // ✅ FIX: SUBMIT LOGIC
  const handleBookingSubmit = async (payload) => {
    try {
      const token = localStorage.getItem("token");
      
      let slotsToBook = [];

      // Check if we are in "Multi Mode" (triggered by the floating button)
      if (viewingSlot?.isMulti) {
          slotsToBook = selectedSlots;
      } 
      // Otherwise, we are viewing a single specific slot (Override/Waitlist)
      else if (viewingSlot) {
          slotsToBook = [viewingSlot];
      }

      if (slotsToBook.length === 0) return;

      let successCount = 0;
      for (const slot of slotsToBook) {
          await createBooking({
              ...payload,
              labCode: slot.labCode,
              date: slot.date,
              period: slot.period
          }, token);
          successCount++;
      }

      alert(`Success! ${successCount} slot(s) processed.`);
      
      // Reset UI
      setSelectedSlots([]);
      setViewingSlot(null);
      loadData(true); 

    } catch (err) {
      alert(err.response?.data?.error || "Booking failed");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
        <div className="w-full lg:flex-1">
          <div className="flex justify-between items-center mb-2 px-1">
            <h2 className="font-bold text-2xl text-slate-800 flex items-center gap-2">
              Lab Schedule
              {isSyncing && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
            </h2>
            <div className="flex gap-2 items-center">
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
          <DateSelector selectedDate={date} onSelect={(d) => { setDate(d); setSelectedSlots([]); }} />
        </div>
      </div>

      <div className="hidden lg:flex gap-4 text-xs justify-start px-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Free</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-600 rounded border-2 border-indigo-200"></span> Selected</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span> Student</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></span> Staff</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="relative min-h-[300px]">
            {isInitialLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl"><div className="text-gray-500 text-sm animate-pulse font-semibold">Loading Schedule...</div></div>}
            
            <TimetableGrid 
              gridData={gridData} 
              onSlotClick={handleSlotClick} 
              currentUser={user} 
              isReadOnly={isPast}
              selectedSlots={selectedSlots} 
            />
          </div>
          
          <LogsViewer logs={logs} />
        </div>
        
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              📢 Announcements
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {announcements.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No announcements</p>
              ) : (
                announcements.map(a => (
                  <div key={a._id} className="p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${a.type === 'Warning' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {a.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${a.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{a.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Expires: {new Date(a.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                📅 Events
              </h3>
              <button onClick={() => setShowCalendar(true)} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700">
                📅 Calendar
              </button>
            </div>
            <div className="space-y-2">
              {events.filter(e => e.date >= date).slice(0, 6).map(e => (
                <button key={e._id} onClick={() => setShowCalendar(true)} className="w-full p-2 bg-slate-50 rounded border text-xs text-left hover:bg-slate-100 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      e.type === 'Semester Exam' ? 'bg-red-100 text-red-700' :
                      ['Test','Exam'].includes(e.type) ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {e.type}
                    </span>
                    <span className="font-mono text-slate-600">{e.date}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{e.purpose}</p>
                  <p className="text-slate-500">{e.labCode} • P{e.period}</p>
                </button>
              ))}
              {events.filter(e => e.date >= date).length === 0 && (
                <p className="text-slate-400 text-sm italic">No upcoming events</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SINGLE SLOT MODAL (Occupied) */}
      {viewingSlot && !viewingSlot.isMulti && (
          <BookingModal 
            slots={[viewingSlot]} 
            onClose={() => setViewingSlot(null)} 
            onSubmit={handleBookingSubmit} 
          />
      )}

      {/* MULTI-SLOT BUTTON */}
      {selectedSlots.length > 0 && !viewingSlot && (
         <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
            <button 
                onClick={() => setViewingSlot({ isMulti: true })} 
                className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold shadow-2xl hover:bg-black hover:scale-105 transition flex items-center gap-3"
            >
                <span>✅ Book {selectedSlots.length} Slot{selectedSlots.length > 1 ? 's' : ''}</span>
            </button>
         </div>
      )}

      {/* MULTI-SLOT MODAL */}
      {selectedSlots.length > 0 && viewingSlot?.isMulti && (
          <BookingModal 
            slots={selectedSlots} 
            onClose={() => setViewingSlot(null)} 
            onSubmit={handleBookingSubmit} 
          />
      )}

      {/* CALENDAR MODAL */}
      {showCalendar && <TestCalendarModal tests={events} onClose={() => setShowCalendar(false)} />}

    </div>
  );
}