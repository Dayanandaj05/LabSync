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

 // 1. Fetch Data
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
        setAnnouncements([]);
        setEvents([]);
      }
    };

    fetchData(); 
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

  // 3. Logic: Calculate Pills
  const today = getTodayString();
  const nextWeek = getNextWeekString();

  const validEvents = events.filter(e => e.date >= today);
  const isThisWeek = (d) => d >= today && d <= nextWeek;

  // ✅ GROUP 1: SEMESTER EXAMS (High Priority - Red)
  const examsThisWeek = validEvents.filter(e => 
    e.type === 'Semester Exam' && isThisWeek(e.date)
  );

  // ✅ GROUP 2: CLASS TESTS (Medium Priority - Purple)
  const testsThisWeek = validEvents.filter(e => 
    ['Test','Exam'].includes(e.type) && isThisWeek(e.date)
  );

  // ✅ GROUP 3: PROJECTS (Orange)
  const projectsThisWeek = validEvents.filter(e => 
    ['Project Review','Workshop'].includes(e.type) && isThisWeek(e.date)
  );

  const customEvents = validEvents
    .filter(e => e.showInBanner && !['Test','Exam','Semester Exam','Project Review','Workshop'].includes(e.type))
    .slice(0, 2);

  const currentMsg = announcements.length > 0 ? announcements[msgIndex] : null;

  if (announcements.length === 0 && validEvents.length === 0) {
      return <div className="bg-indigo-900 text-white text-center py-1 text-[10px] font-medium opacity-80">LabSync Scheduling System</div>;
  }

  return (
    <>
      <div className="bg-indigo-900 text-white shadow-md relative z-30 transition-colors duration-500"
           style={{ backgroundColor: currentMsg?.type === 'Warning' ? '#7f1d1d' : '#312e81' }}> 
        
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          
          {/* Announcements Text */}
          <div className="flex-1 flex items-center gap-3 overflow-hidden w-full min-h-[24px]">
            {currentMsg ? (
              <>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 border 
                  ${currentMsg.type === 'Warning' ? 'bg-red-500/20 border-red-400 text-red-100' : 'bg-white/20 border-white/20'}`}>
                  {currentMsg.type || 'Notice'}
                </span>
                <div className={`flex-1 truncate font-medium opacity-90 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
                  {currentMsg.message}
                </div>
                {announcements.length > 1 && (
                   <div className="flex gap-1">
                     {announcements.map((_, i) => (
                       <div key={i} className={`w-1 h-1 rounded-full ${i === msgIndex ? 'bg-white' : 'bg-white/30'}`}></div>
                     ))}
                   </div>
                )}
              </>
            ) : (
                <span className="text-indigo-200 italic text-xs">No new announcements.</span>
            )}
          </div>

          {/* Pills (Clickable) */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end overflow-x-auto no-scrollbar">
            
            {/* 🔴 EXAMS (Semester) */}
            {examsThisWeek.length > 0 && (
              <button onClick={() => setShowCalendar(true)} className="group flex items-center bg-red-900/50 border border-red-400/50 px-3 py-1 rounded-full hover:bg-red-800 transition">
                <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-[10px] text-red-200 font-bold mr-1">EXAMS:</span>
                <span className="text-[10px] text-white font-bold">{examsThisWeek.length} This Week</span>
              </button>
            )}

            {/* 🟣 TESTS (Class) */}
            {testsThisWeek.length > 0 && (
              <button onClick={() => setShowCalendar(true)} className="group flex items-center bg-purple-900/50 border border-purple-400/50 px-3 py-1 rounded-full hover:bg-purple-800 transition">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                <span className="text-[10px] text-purple-200 font-bold mr-1">TESTS:</span>
                <span className="text-[10px] text-white font-bold">{testsThisWeek.length} This Week</span>
              </button>
            )}

            {/* 🟠 PROJECTS */}
            {projectsThisWeek.length > 0 && (
              <button onClick={() => setShowCalendar(true)} className="group flex items-center bg-orange-900/50 border border-orange-400/50 px-3 py-1 rounded-full hover:bg-orange-800 transition">
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                <span className="text-[10px] text-orange-200 font-bold mr-1">PROJECTS:</span>
                <span className="text-[10px] text-white font-bold">{projectsThisWeek.length} This Week</span>
              </button>
            )}

            {/* Custom Events */}
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
            
            <button onClick={() => setShowCalendar(true)} className="bg-white text-indigo-900 px-3 py-1 rounded-md text-[10px] font-bold hover:bg-indigo-50 transition shadow-sm whitespace-nowrap">
              📅 Calendar
            </button>
          </div>
        </div>
      </div>
      {showCalendar && <TestCalendarModal tests={validEvents} onClose={() => setShowCalendar(false)} />}
    </>
  );
}