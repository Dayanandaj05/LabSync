import React, { useState } from "react";

export default function TestCalendarModal({ tests = [], onClose }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewDate, setViewDate] = useState(new Date()); // ✅ Track current month view

  // Get unique dates that have tests
  const testDates = [...new Set(tests.map(t => t.date))];

  // Calendar Logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...

  // Create empty slots for alignment
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    // Handle Timezone offset issues by forcing ISO string logic safely
    const offset = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  });

  const calendarGrid = [...blanks, ...days];

  // Handlers
  const changeMonth = (offset) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
    setSelectedDate(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* Left: Calendar Grid */}
        <div className="flex-1 p-6 border-r border-slate-100 overflow-y-auto flex flex-col">
          
          {/* Header & Navigation */}
          <div className="flex justify-between items-center mb-6 bg-slate-50 p-2 rounded-lg">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow text-slate-500 font-bold">‹</button>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">{monthName}</h2>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow text-slate-500 font-bold">›</button>
          </div>
          
          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} className="text-center text-xs font-bold text-slate-400">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2 content-start">
            {calendarGrid.map((dateStr, i) => {
              if (!dateStr) return <div key={i} className="h-10"></div>; // Blank slot

              const hasTest = testDates.includes(dateStr);
              const isSelected = selectedDate === dateStr;
              const dayNum = parseInt(dateStr.slice(-2));
              const isToday = dateStr === new Date().toISOString().slice(0, 10);

              return (
                <button
                  key={dateStr}
                  onClick={() => hasTest && setSelectedDate(dateStr)}
                  disabled={!hasTest}
                  className={`h-12 rounded-xl text-sm font-bold transition-all relative flex items-center justify-center border-2 ${
                    isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-110 z-10' :
                    hasTest ? 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 shadow-sm' : 
                    'text-slate-300 border-transparent bg-slate-50/50 cursor-default'
                  } ${isToday && !isSelected && !hasTest ? 'border-blue-200 text-blue-400' : ''}`}
                >
                  {dayNum}
                  {hasTest && !isSelected && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  )}
                </button>
              )
            })}
          </div>
          
          <div className="mt-auto pt-6 text-xs text-slate-400 text-center border-t border-slate-50">
            <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
            Events/Tests
          </div>
        </div>

        {/* Right: Details Panel */}
        <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col relative border-l border-slate-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl">✕</button>
          
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6">
            {selectedDate 
              ? new Date(selectedDate).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'}) 
              : "Event Details"
            }
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {selectedDate ? (
              tests.filter(t => t.date === selectedDate).map(t => (
                <div key={t._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      t.type === 'Test' ? 'bg-purple-100 text-purple-700' : 
                      t.type === 'Project Review' ? 'bg-orange-100 text-orange-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {t.type}
                    </span>
                    <span className="text-lg font-bold text-slate-800">{t.lab.code}</span>
                  </div>
                  
                  <p className="text-sm text-slate-600 font-medium mb-2 leading-tight">"{t.purpose}"</p>
                  
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
                    <span className="text-xs font-bold text-slate-500">Period {t.period}</span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">{t.creatorName}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <span className="text-4xl mb-2">👈</span>
                Select a date with a dot to view scheduled tests.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}