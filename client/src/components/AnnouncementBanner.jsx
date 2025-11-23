import React, { useEffect, useState } from "react";
import API from "../services/api";
import TestCalendarModal from "./TestCalendarModal.jsx";
import { getTodayString, getNextWeekString } from "../utils/dateSystem";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]); 
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Message Cycling
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

 // 1. Fetch Data (With Polling)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [annoRes, eventsRes] = await Promise.all([
          API.get("/api/public/announcements"),
          API.get("/api/public/upcoming-tests")
        ]);
        setAnnouncements(annoRes.data.announcements || []);
        setEvents(eventsRes.data.tests || []);
      } catch (err) {
        console.error("Banner Data Error:", err);
      }
    };

    fetchData(); // Initial Load

    // ✅ Poll every 30 seconds to keep banner fresh
    const pollInterval = setInterval(fetchData, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  // 2. Cycle Logic
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false); 
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % announcements.length);
        setFade(true); 
      }, 300); 
    }, 4000); 
    return () => clearInterval(interval);
  }, [announcements]);

  // 3. Logic: String vs String
  const today = getTodayString();
  const nextWeek = getNextWeekString();

  // Filter: Event Date must be >= Today
  const validEvents = events.filter(e => e.date >= today);

  // Helper: Is it this week?
  const isThisWeek = (d) => d >= today && d <= nextWeek;

  const testsThisWeek = validEvents.filter(e => 
    ['Test','Exam'].includes(e.type) && isThisWeek(e.date)
  );

  const projectsThisWeek = validEvents.filter(e => 
    ['Project Review','Workshop'].includes(e.type) && isThisWeek(e.date)
  );

  const customEvents = validEvents
    .filter(e => e.showInBanner && !['Test','Exam','Project Review','Workshop'].includes(e.type))
    .slice(0, 2);

  const hasPills = testsThisWeek.length > 0 || projectsThisWeek.length > 0 || customEvents.length > 0;
  
  if (announcements.length === 0 && !hasPills) {
      return <div className="bg-indigo-900 text-white text-center py-2 text-xs font-medium opacity-90">👋 Welcome to LabSync.</div>;
  }

  const currentMsg = announcements.length > 0 ? announcements[msgIndex] : null;

  return (
    <>
      <div className="bg-indigo-900 text-white shadow-md relative z-30"
           style={{ backgroundColor: currentMsg?.type === 'Warning' ? '#7f1d1d' : '#312e81' }}> 
        
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          
          {/* Announcements */}
          <div className="flex-1 flex items-center gap-3 overflow-hidden w-full min-h-[24px]">
            {currentMsg && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 border 
                ${currentMsg.type === 'Warning' ? 'bg-red-500/20 border-red-400 text-red-100' : 'bg-white/20 border-white/20'}`}>
                {currentMsg.type || 'Notice'}
              </span>
            )}
            <div className={`flex-1 truncate font-medium opacity-90 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              {currentMsg ? currentMsg.message : "Check the schedule below."}
            </div>
            {announcements.length > 1 && (
               <div className="flex gap-1">
                 {announcements.map((_, i) => (
                   <div key={i} className={`w-1 h-1 rounded-full ${i === msgIndex ? 'bg-white' : 'bg-white/30'}`}></div>
                 ))}
               </div>
            )}
          </div>

          {/* Pills */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end overflow-x-auto no-scrollbar">
            
            {testsThisWeek.length > 0 && (
              <button onClick={() => setShowCalendar(true)} className="group flex items-center bg-purple-900/50 border border-purple-400/50 px-3 py-1 rounded-full hover:bg-purple-800 transition">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-[10px] text-purple-200 font-bold mr-1">TESTS:</span>
                <span className="text-[10px] text-white font-bold">{testsThisWeek.length} This Week</span>
              </button>
            )}

            {projectsThisWeek.length > 0 && (
              <button onClick={() => setShowCalendar(true)} className="group flex items-center bg-orange-900/50 border border-orange-400/50 px-3 py-1 rounded-full hover:bg-orange-800 transition">
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-[10px] text-orange-200 font-bold mr-1">PROJECTS:</span>
                <span className="text-[10px] text-white font-bold">{projectsThisWeek.length} This Week</span>
              </button>
            )}

            {customEvents.map(evt => {
                let colorClass = "bg-blue-900/50 border-blue-500/50 text-blue-200";
                let dotClass = "bg-blue-400";
                if(evt.bannerColor === 'pink') { colorClass = "bg-pink-900/50 border-pink-500/50 text-pink-200"; dotClass = "bg-pink-400"; }
                if(evt.bannerColor === 'red') { colorClass = "bg-red-900/50 border-red-500/50 text-red-200"; dotClass = "bg-red-400"; }
                if(evt.bannerColor === 'green') { colorClass = "bg-emerald-900/50 border-emerald-500/50 text-emerald-200"; dotClass = "bg-emerald-400"; }
                
                return (
                  <button key={evt._id} onClick={() => setShowCalendar(true)} className={`hidden sm:flex items-center ${colorClass} border px-3 py-1 rounded-full hover:bg-white/10 transition`}>
                    <span className={`w-2 h-2 ${dotClass} rounded-full mr-2`}></span>
                    <span className="text-[10px] font-bold uppercase truncate max-w-[100px]">{evt.purpose}</span>
                  </button>
                )
            })}
            
            <button onClick={() => setShowCalendar(true)} className="bg-white text-indigo-900 px-3 py-1 rounded-md text-[10px] font-bold hover:bg-indigo-50 transition shadow-sm">
              📅 Calendar
            </button>
          </div>
        </div>
      </div>
      {showCalendar && <TestCalendarModal tests={events} onClose={() => setShowCalendar(false)} />}
    </>
  );
}