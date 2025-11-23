import React, { useState } from "react";
import { getCalendarGrid, getTodayString, formatDateDisplay } from "../utils/dateSystem";

export default function TestCalendarModal({ tests = [], onClose }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const todayStr = getTodayString();
  const grid = getCalendarGrid(viewYear, viewMonth);
  // Get all dates that have ANY event
  const eventDates = [...new Set(tests.map(t => t.date))];

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleNav = (dir) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m > 11) { m = 0; y++; }
    else if (m < 0) { m = 11; y--; }
    setViewMonth(m);
    setViewYear(y);
    setSelectedDate(null);
  };

  // Helper: Get Color Style based on Event Type
  const getEventStyle = (evt) => {
    const type = evt.type;
    // 1. Tests / Exams (Purple)
    if (['Test', 'Exam'].includes(type)) return 'bg-purple-100 text-purple-700 border-purple-200';
    // 2. Project Reviews (Orange)
    if (type === 'Project Review') return 'bg-orange-100 text-orange-700 border-orange-200';
    // 3. Workshops (Teal)
    if (type === 'Workshop') return 'bg-teal-100 text-teal-700 border-teal-200';
    
    // 4. Custom Events (Based on Banner Color or Default)
    if (evt.showInBanner) {
        if (evt.bannerColor === 'red') return 'bg-red-100 text-red-700 border-red-200';
        if (evt.bannerColor === 'pink') return 'bg-pink-100 text-pink-700 border-pink-200';
        if (evt.bannerColor === 'green') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    // Default (Blue/Indigo)
    return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* LEFT: CALENDAR GRID */}
        <div className="flex-1 p-6 border-r border-slate-100 overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center mb-6 bg-slate-50 p-2 rounded-lg">
            <button onClick={() => handleNav(-1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-white font-bold">‹</button>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">{monthName}</h2>
            <button onClick={() => handleNav(1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-white font-bold">›</button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} className="text-center text-xs font-bold text-slate-300">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2 content-start">
            {grid.map((dateStr, i) => {
              if (!dateStr) return <div key={i} className="h-10"></div>;
              
              const dayNum = parseInt(dateStr.split('-')[2]);
              const hasEvent = eventDates.includes(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <button key={dateStr} disabled={!hasEvent} onClick={() => setSelectedDate(dateStr)}
                  className={`h-12 rounded-xl text-sm font-bold transition-all relative flex items-center justify-center border-2 
                    ${isSelected ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-110 z-10' : 
                      hasEvent ? 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 cursor-pointer shadow-sm' : 
                      'text-slate-300 border-transparent bg-slate-50/50 cursor-default'}
                    ${isToday && !isSelected && !hasEvent ? 'ring-2 ring-blue-100 border-blue-300 text-blue-500' : ''}
                  `}
                >
                  {dayNum}
                  {hasEvent && !isSelected && <span className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>}
                </button>
              );
            })}
          </div>
          
          <div className="mt-auto pt-4 text-[10px] text-slate-400 text-center border-t border-slate-50 flex justify-center gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Tests</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Reviews</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400"></span> Workshops</span>
          </div>
        </div>

        {/* RIGHT: EVENT DETAILS LIST */}
        <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col relative border-l border-slate-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl">✕</button>
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6">
            {selectedDate ? formatDateDisplay(selectedDate) : "Important Events"}
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {selectedDate ? (
               tests.filter(t => t.date === selectedDate).map(t => (
                 <div key={t._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getEventStyle(t)}`}>
                        {t.type}
                      </span>
                      <span className="text-md font-bold text-slate-800 bg-slate-100 px-2 rounded">{t.lab.code}</span>
                    </div>
                    
                    <p className="text-sm text-slate-700 font-bold leading-snug mb-1">"{t.purpose}"</p>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
                       <span className="text-xs font-bold text-slate-500">Period {t.period}</span>
                       <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">{t.creatorName}</span>
                    </div>
                 </div>
               ))
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm p-4 text-center">
                 <span className="text-4xl mb-3">📅</span> 
                 <p>Select a date to view Tests, Reviews, and Events.</p>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}