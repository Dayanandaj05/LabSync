import React, { useEffect, useState } from "react";
import API from "../services/api";
import TestCalendarModal from "./TestCalendarModal.jsx"; // ✅ Import Modal

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [tests, setTests] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false); // ✅ Modal State

  useEffect(() => {
    API.get("/api/public/announcements").then((res) => setAnnouncements(res.data.announcements || []));
    API.get("/api/public/upcoming-tests").then((res) => setTests(res.data.tests || []));
  }, []);

  if (announcements.length === 0 && tests.length === 0) {
      return <div className="bg-indigo-900 text-white text-center py-2 text-xs font-medium opacity-90">👋 Welcome to LabSync.</div>;
  }

  // Find nearest test
  const nearestTest = tests.length > 0 ? tests[0] : null;

  return (
    <>
      <div className="bg-indigo-900 text-white shadow-md relative z-30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          
          {/* LEFT: Announcements */}
          <div className="flex-1 flex items-center gap-3 overflow-hidden w-full">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 animate-pulse">
              Notice
            </span>
            <div className="flex-1 truncate font-medium opacity-90">
              {announcements.length > 0 ? announcements[0].message : "Check the schedule below."}
            </div>
          </div>

          {/* RIGHT: Test Info & Button */}
          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
            {nearestTest && (
              <div className="text-xs flex items-center gap-2 bg-indigo-800/50 px-3 py-1 rounded-full border border-indigo-700">
                <span className="text-indigo-300 font-bold">NEXT EXAM:</span>
                <span className="font-bold text-white">
                  {new Date(nearestTest.date).toLocaleDateString([], {month:'short', day:'numeric'})} • {nearestTest.lab.code}
                </span>
              </div>
            )}
            
            {/* ✅ View Calendar Button */}
            <button 
              onClick={() => setShowCalendar(true)}
              className="bg-white text-indigo-900 px-3 py-1 rounded-md text-xs font-bold hover:bg-indigo-50 transition flex items-center gap-1 shadow-sm"
            >
              📅 View All Tests
            </button>
          </div>
        </div>
      </div>

      {/* ✅ RENDER MODAL */}
      {showCalendar && (
        <TestCalendarModal tests={tests} onClose={() => setShowCalendar(false)} />
      )}
    </>
  );
}