import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import API from "../services/api";
import { getLocalToday } from "../utils/dateHelpers.js"; 

export default function DateSelector({ selectedDate, onSelect }) {
  const [statusMap, setStatusMap] = useState({});
  const [todayStr, setTodayStr] = useState(getLocalToday());
  
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);

  // 1. Update "Today" string every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const newToday = getLocalToday();
      if (newToday !== todayStr) setTodayStr(newToday);
    }, 60000); 
    return () => clearInterval(interval);
  }, [todayStr]);

  // 2. DYNAMIC DATE RANGE (Selected Date +/- 30 days)
  const pivotDate = selectedDate ? new Date(selectedDate) : new Date();
  pivotDate.setHours(0,0,0,0);

  const days = Array.from({ length: 61 }, (_, i) => {
    const d = new Date(pivotDate);
    d.setDate(d.getDate() + (i - 30)); 
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // 3. Fetch Status Dots
  useEffect(() => {
    const start = days[0];
    API.get(`/api/public/calendar-status?start=${start}&days=61`)
      .then(res => setStatusMap(res.data.statusMap || {}))
      .catch(err => console.error(err));
  }, [selectedDate]);

  // 4. AUTO-CENTER ON SELECTION
  useLayoutEffect(() => {
    if (selectedRef.current && scrollRef.current) {
        const container = scrollRef.current;
        const item = selectedRef.current;
        const scrollPos = item.offsetLeft - (container.clientWidth / 2) + (item.clientWidth / 2);
        container.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [selectedDate]); 

  // 5. MOUSE SCROLL LOGIC (Wheel)
  const handleWheel = (e) => {
    if (scrollRef.current) {
        scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // 6. ✅ BUTTON SCROLL LOGIC (Click)
  const scrollContainer = (direction) => {
    if (scrollRef.current) {
        const scrollAmount = 200; // Pixel amount to scroll per click
        scrollRef.current.scrollBy({ 
            left: direction * scrollAmount, 
            behavior: 'smooth' 
        });
    }
  };

  return (
    <>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full overflow-hidden relative select-none group">
        
        {/* ✅ LEFT SCROLL BUTTON */}
        <button 
            onClick={() => scrollContainer(-1)}
            className="absolute left-0 top-0 bottom-0 w-8 z-20 flex items-center justify-center bg-gradient-to-r from-white via-white to-transparent text-slate-400 hover:text-indigo-600 hover:from-white hover:via-white hover:to-white/50 transition-colors"
        >
            <span className="text-2xl font-bold pb-1">‹</span>
        </button>

        {/* Scrollable Container */}
        <div 
            ref={scrollRef} 
            onWheel={handleWheel} 
            className="flex gap-2 overflow-x-auto hide-scrollbar flex-1 px-8 py-1 items-center" // Added px-8 for button space
        >
          {days.map((dateStr) => {
            const dateObj = new Date(dateStr + "T00:00:00");
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const dayNum = dateObj.getDate();
            
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr; 
            const info = statusMap[dateStr] || { count: 0 };
            const isFull = info.count > 20; 
            
            let statusDot = "bg-green-400"; 
            if (info.hasMaintenance) statusDot = "bg-slate-900"; 
            else if (info.hasExam) statusDot = "bg-purple-600";
            else if (info.hasReview) statusDot = "bg-orange-500";
            else if (isFull) statusDot = "bg-red-500";
            else if (info.count === 0) statusDot = "bg-green-400";

            return (
              <button
                key={dateStr}
                ref={isSelected ? selectedRef : null}
                onClick={() => onSelect(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[64px] h-[76px] rounded-2xl transition-all duration-200 relative shrink-0 border-2 ${
                  isSelected 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105 z-10' 
                    : isToday
                      ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-md ring-2 ring-blue-100'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-slate-400' : isToday ? 'text-blue-500' : 'text-slate-400'}`}>
                  {isToday ? "Today" : dayName}
                </span>
                <span className="text-xl font-extrabold leading-none mt-0.5">
                  {dayNum}
                </span>
                <span className={`text-[9px] font-medium leading-none mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-400 opacity-80'}`}>
                  {monthName}
                </span>
                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${statusDot} ring-2 ring-white shadow-sm`}></span>
              </button>
            );
          })}
        </div>

        {/* ✅ RIGHT SCROLL BUTTON (Positioned before the Picker) */}
        <button 
            onClick={() => scrollContainer(1)}
            className="absolute right-[72px] top-0 bottom-0 w-8 z-20 flex items-center justify-center bg-gradient-to-l from-white via-white to-transparent text-slate-400 hover:text-indigo-600 hover:from-white hover:via-white hover:to-white/50 transition-colors"
        >
            <span className="text-2xl font-bold pb-1">›</span>
        </button>

        <div className="w-[1px] h-10 bg-slate-200 mx-1"></div>

        {/* Calendar Picker Trigger */}
        <div className="relative shrink-0 z-20">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onSelect(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
            title="Pick any date"
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