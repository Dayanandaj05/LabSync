import React, { useState } from "react";

export default function TestCalendarModal({ tests = [], onClose }) {
  const [selectedDate, setSelectedDate] = useState(null);

  // Get unique dates that have tests
  const testDates = [...new Set(tests.map(t => t.date))];

  // Calendar Logic (Current Month View)
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row h-[500px]">
        
        {/* Left: Calendar Grid */}
        <div className="flex-1 p-6 border-r border-slate-100 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">📅 Test Schedule</h2>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{currentMonth}</span>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} className="text-center text-xs font-bold text-slate-300 mb-2">{d}</div>
            ))}
            {days.map(dateStr => {
              const hasTest = testDates.includes(dateStr);
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => hasTest && setSelectedDate(dateStr)}
                  disabled={!hasTest}
                  className={`h-10 rounded-lg text-xs font-bold transition-all relative ${
                    isSelected ? 'bg-indigo-600 text-white shadow-md scale-110' :
                    hasTest ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer' : 
                    'text-slate-300 bg-slate-50 cursor-default'
                  }`}
                >
                  {parseInt(dateStr.slice(-2))}
                  {hasTest && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full"></span>}
                </button>
              )
            })}
          </div>
          <div className="mt-6 text-xs text-slate-400 text-center">
            Click a highlighted date to view details.
          </div>
        </div>

        {/* Right: Details Panel */}
        <div className="w-full md:w-72 bg-slate-50 p-6 flex flex-col relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl">✕</button>
          
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'}) : "Select a Date"}
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3">
            {selectedDate ? (
              tests.filter(t => t.date === selectedDate).map(t => (
                <div key={t._id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-lg font-bold text-indigo-700">{t.lab.code}</span>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">Period {t.period}</span>
                  </div>
                  <p className="text-xs text-slate-500 italic">"{t.purpose}"</p>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono">
                    By: {t.creatorName}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-sm mt-10">
                Select a date to see scheduled exams.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}