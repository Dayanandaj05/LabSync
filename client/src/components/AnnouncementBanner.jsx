import React, { useEffect, useState } from "react";
import API from "../services/api";
import TestCalendarModal from "./TestCalendarModal.jsx";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]); 
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    API.get("/api/public/announcements").then((res) => setAnnouncements(res.data.announcements || []));
    API.get("/api/public/upcoming-tests").then((res) => setEvents(res.data.tests || []));
  }, []);

  if (announcements.length === 0 && events.length === 0) {
      return <div className="bg-indigo-900 text-white text-center py-2 text-xs font-medium opacity-90">👋 Welcome to LabSync.</div>;
  }

  // --- SUMMARY LOGIC ---
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const futureEvents = events.filter(e => new Date(e.date) >= today);
  
  // Count Logic
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const isThisWeek = (d) => new Date(d) < nextWeek && new Date(d) >= today;
  
  const testCountThisWeek = futureEvents.filter(e => ['Test','Exam'].includes(e.type) && isThisWeek(e.date)).length;
  const testCountNextWeek = futureEvents.filter(e => ['Test','Exam'].includes(e.type) && !isThisWeek(e.date)).length;
  
  const projectCountThisWeek = futureEvents.filter(e => ['Project Review','Workshop'].includes(e.type) && isThisWeek(e.date)).length;
  const projectCountNextWeek = futureEvents.filter(e => ['Project Review','Workshop'].includes(e.type) && !isThisWeek(e.date)).length;

  return (
    <>
      <div className="bg-indigo-900 text-white shadow-md relative z-30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          
          {/* LEFT: Announcements */}
          <div className="flex-1 flex items-center gap-3 overflow-hidden w-full">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 border border-white/20">
              Notice
            </span>
            <div className="flex-1 truncate font-medium opacity-90">
              {announcements.length > 0 ? announcements[0].message : "Check the schedule below."}
            </div>
          </div>

          {/* RIGHT: Summary & Buttons */}
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end overflow-x-auto no-scrollbar">
            
            {/* TESTS SUMMARY PILL (Clickable) */}
            {(testCountThisWeek > 0 || testCountNextWeek > 0) && (
              <button 
                onClick={() => setShowCalendar(true)}
                className="text-[10px] flex items-center bg-purple-900/50 border border-purple-500/50 px-3 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-purple-800 transition-all active:scale-95"
                title="Click to view dates"
              >
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-purple-200 font-bold mr-1">TESTS:</span>
                <span className="text-white font-medium">
                  {testCountThisWeek > 0 && `${testCountThisWeek} This Week`}
                  {testCountThisWeek > 0 && testCountNextWeek > 0 && ', '}
                  {testCountNextWeek > 0 && `${testCountNextWeek} Next Week`}
                </span>
              </button>
            )}

            {/* PROJECTS SUMMARY PILL (Clickable) */}
            {(projectCountThisWeek > 0 || projectCountNextWeek > 0) && (
              <button 
                onClick={() => setShowCalendar(true)}
                className="text-[10px] flex items-center bg-orange-900/50 border border-orange-500/50 px-3 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-orange-800 transition-all active:scale-95"
                title="Click to view dates"
              >
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-orange-200 font-bold mr-1">PROJECTS:</span>
                <span className="text-white font-medium">
                  {projectCountThisWeek > 0 && `${projectCountThisWeek} This Week`}
                  {projectCountThisWeek > 0 && projectCountNextWeek > 0 && ', '}
                  {projectCountNextWeek > 0 && `${projectCountNextWeek} Next Week`}
                </span>
              </button>
            )}
            
            <button 
              onClick={() => setShowCalendar(true)}
              className="bg-white text-indigo-900 px-3 py-1 rounded-md text-xs font-bold hover:bg-indigo-50 transition flex items-center gap-1 shadow-sm shrink-0"
            >
              📅 View Calendar
            </button>
          </div>
        </div>
      </div>

      {showCalendar && (
        <TestCalendarModal tests={events} onClose={() => setShowCalendar(false)} />
      )}
    </>
  );
}