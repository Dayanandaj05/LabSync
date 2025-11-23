import React, { useEffect, useState } from "react";
import API from "../services/api";
import TestCalendarModal from "./TestCalendarModal.jsx";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]); 
  const [showCalendar, setShowCalendar] = useState(false);
  
  // ✅ Cycling State
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    API.get("/api/public/announcements").then((res) => setAnnouncements(res.data.announcements || []));
    API.get("/api/public/upcoming-tests").then((res) => setEvents(res.data.tests || []));
  }, []);

  // ✅ Cycle Logic: Change message every 4 seconds if > 1 announcement
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false); // Fade out
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % announcements.length);
        setFade(true); // Fade in
      }, 300); // Wait for fade out
    }, 4000); 
    return () => clearInterval(interval);
  }, [announcements]);

  if (announcements.length === 0 && events.length === 0) {
      return <div className="bg-indigo-900 text-white text-center py-2 text-xs font-medium opacity-90">👋 Welcome to LabSync.</div>;
  }

  // --- PILL PRIORITY LOGIC ---
  const today = new Date();
  today.setHours(0,0,0,0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const isThisWeek = (dStr) => {
    const d = new Date(dStr);
    return d >= today && d < nextWeek;
  };

  const futureEvents = events.filter(e => new Date(e.date) >= today);

  // 1. High Priority: Tests This Week
  const testsThisWeek = futureEvents.filter(e => ['Test','Exam'].includes(e.type) && isThisWeek(e.date));

  // 2. High Priority: Projects/Workshops This Week
  const projectsThisWeek = futureEvents.filter(e => ['Project Review','Workshop'].includes(e.type) && isThisWeek(e.date));

  // 3. Custom Banner Events (Limit to 2)
  const customEvents = futureEvents
    .filter(e => e.showInBanner && !['Test','Exam','Project Review','Workshop'].includes(e.type))
    .slice(0, 2);

  const currentMsg = announcements.length > 0 ? announcements[msgIndex] : null;

  return (
    <>
      <div className="bg-indigo-900 text-white shadow-md relative z-30 transition-colors duration-500"
           style={{ backgroundColor: currentMsg?.type === 'Warning' ? '#7f1d1d' : '#312e81' }}> {/* Red for Warning, Indigo for Info */}
        
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          
          {/* LEFT: Cycling Announcements */}
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
            
            {/* Dots indicator for multiple messages */}
            {announcements.length > 1 && (
               <div className="flex gap-1">
                 {announcements.map((_, i) => (
                   <div key={i} className={`w-1 h-1 rounded-full ${i === msgIndex ? 'bg-white' : 'bg-white/30'}`}></div>
                 ))}
               </div>
            )}
          </div>

          {/* RIGHT: Priority Pills */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end overflow-x-auto no-scrollbar">
            
            {/* 1. TESTS (This Week) */}
            {testsThisWeek.length > 0 && (
              <button onClick={() => setShowCalendar(true)}
                className="text-[10px] flex items-center bg-purple-900/50 border border-purple-400/50 px-3 py-1 rounded-full whitespace-nowrap hover:bg-purple-800 transition"
              >
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-purple-200 font-bold mr-1">TESTS:</span>
                <span className="text-white font-bold">{testsThisWeek.length} This Week</span>
              </button>
            )}

            {/* 2. PROJECTS (This Week) */}
            {projectsThisWeek.length > 0 && (
              <button onClick={() => setShowCalendar(true)}
                className="text-[10px] flex items-center bg-orange-900/50 border border-orange-400/50 px-3 py-1 rounded-full whitespace-nowrap hover:bg-orange-800 transition"
              >
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-orange-200 font-bold mr-1">PROJECTS:</span>
                <span className="text-white font-bold">{projectsThisWeek.length} This Week</span>
              </button>
            )}

            {/* 3. CUSTOM EVENTS */}
            {customEvents.map(evt => {
               let colorStyle = "bg-blue-900/50 border-blue-500/50 text-blue-200";
               let dotColor = "bg-blue-400";
               if(evt.bannerColor === 'pink') { colorStyle = "bg-pink-900/50 border-pink-500/50 text-pink-200"; dotColor = "bg-pink-400"; }
               if(evt.bannerColor === 'green') { colorStyle = "bg-emerald-900/50 border-emerald-500/50 text-emerald-200"; dotColor = "bg-emerald-400"; }
               
               return (
                  <button key={evt._id} onClick={() => setShowCalendar(true)}
                     className={`text-[10px] flex items-center ${colorStyle} border px-3 py-1 rounded-full whitespace-nowrap hover:bg-white/10 transition hidden sm:flex`}
                  >
                     <span className={`w-1.5 h-1.5 ${dotColor} rounded-full mr-2`}></span>
                     <span className="font-bold mr-1 uppercase truncate max-w-[80px]">{evt.purpose}</span>
                  </button>
               )
            })}
            
            <button onClick={() => setShowCalendar(true)} className="bg-white text-indigo-900 px-3 py-1 rounded-md text-xs font-bold hover:bg-indigo-50 transition flex items-center gap-1 shadow-sm shrink-0">
              📅 Calendar
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