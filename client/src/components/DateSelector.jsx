import React, { useEffect, useState, useRef } from "react";
import API from "../services/api";

export default function DateSelector({ selectedDate, onSelect }) {
  const [statusMap, setStatusMap] = useState({});
  const scrollRef = useRef(null);
  const todayRef = useRef(null);

  // 1. Generate Date Range (-30 to +30 days)
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const todayStr = todayObj.toISOString().slice(0, 10);

  // Total 61 days (30 before + today + 30 after)
  const days = Array.from({ length: 61 }, (_, i) => {
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() + (i - 30)); // Start 30 days ago
    return d.toISOString().slice(0, 10);
  });

  // 2. Fetch Data & Scroll to Today
  useEffect(() => {
    const start = days[0];
    
    // Fetch status for the visible range (61 days)
    API.get(`/api/public/calendar-status?start=${start}&days=61`)
      .then(res => setStatusMap(res.data.statusMap || {}))
      .catch(err => console.error(err));

    // Scroll to 'Today' after a short delay to ensure render
    setTimeout(() => {
      if (todayRef.current && scrollRef.current) {
        const container = scrollRef.current;
        const item = todayRef.current;
        
        // Center the item
        const scrollPos = item.offsetLeft - (container.clientWidth / 2) + (item.clientWidth / 2);
        container.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  // Horizontal Scroll with Mouse Wheel
  const handleWheel = (e) => {
    if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY;
  };

  return (
    <>
      {/* CSS to Hide Scrollbars */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full overflow-hidden relative select-none">
        
        {/* Left Gradient Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>

        {/* SLIDING DATE STRIP */}
        <div 
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex gap-2 overflow-x-auto no-scrollbar flex-1 scroll-smooth px-2 py-1"
        >
          {days.map((dateStr) => {
            const dateObj = new Date(dateStr);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            
            // Status Logic (Colors)
            const info = statusMap[dateStr] || { hasExam: false, count: 0 };
            const isBusy = info.count > 20; 
            
            let statusDot = null;
            if (info.hasExam) statusDot = "bg-purple-500";
            else if (isBusy) statusDot = "bg-red-500";
            else if (info.count > 0) statusDot = "bg-green-400";

            return (
              <button
                key={dateStr}
                ref={isToday ? todayRef : null}
                onClick={() => onSelect(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[64px] h-[76px] rounded-2xl transition-all duration-300 relative shrink-0 border-2 ${
                  isSelected 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105 z-20' 
                    : isToday
                      ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-md ring-2 ring-blue-100'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-slate-400' : isToday ? 'text-blue-500' : 'text-slate-400'}`}>
                  {isToday ? "Today" : dayName}
                </span>
                <span className="text-xl font-extrabold leading-none mt-1">
                  {dayNum}
                </span>
                
                {/* Status Dot */}
                {statusDot && (
                  <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${statusDot} ring-2 ring-white shadow-sm`}></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Gradient Fade */}
        <div className="absolute right-[80px] top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>

        {/* Divider */}
        <div className="w-[1px] h-10 bg-slate-200"></div>

        {/* CALENDAR PICKER */}
        <div className="relative shrink-0 z-20">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onSelect(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Open Calendar"
          />
          <button className="flex flex-col items-center justify-center w-[70px] h-[76px] bg-indigo-50 text-indigo-600 border-2 border-indigo-100 rounded-2xl hover:bg-indigo-100 hover:border-indigo-200 transition-all shadow-sm group active:scale-95">
            <span className="text-2xl group-hover:scale-110 transition-transform duration-200">📅</span>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wide text-indigo-400 group-hover:text-indigo-600">Pick</span>
          </button>
        </div>

      </div>
    </>
  );
}