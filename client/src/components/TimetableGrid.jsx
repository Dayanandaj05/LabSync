import React from "react";

const PERIOD_LABELS = {
  1: "8:30 - 9:20",
  2: "9:20 - 10:10",
  3: "10:10 - 10:30", // BREAK
  4: "10:30 - 11:20",
  5: "11:20 - 12:10",
  6: "12:10 - 1:40",  // LUNCH
  7: "1:40 - 2:30",
  8: "2:30 - 3:20",
  9: "3:20 - 4:30",
};

export default function TimetableGrid({ gridData, onSlotClick, currentUser, isReadOnly }) {
  const { labs = [], schedule = {} } = gridData || {}; 
  const periods = Object.keys(PERIOD_LABELS).map(Number);
  const isAdmin = currentUser?.role === 'Admin';

  const getCellStyle = (cell) => {
    // ✅ Past Date Styling: Just subtle, not blocking view
    if (isReadOnly && !cell) return "bg-slate-50 cursor-not-allowed"; 

    if (!cell) {
      // If past, don't show hover effects
      if (isReadOnly) return "bg-white";
      return "bg-white hover:bg-emerald-50/60 hover:shadow-[inset_0_0_0_2px_rgba(16,185,129,0.2)] cursor-pointer group";
    }
    
    const isMine = currentUser && cell.creatorName === currentUser.name;
    const baseBorder = isMine ? "border-2 border-indigo-500 z-10" : "border-l-4"; 
    // Admins can click even if it's past? Maybe not for modification, but let's keep standard UI
    const adminCursor = (isAdmin && !isReadOnly) ? "cursor-pointer hover:opacity-80 hover:shadow-inner" : "cursor-not-allowed";

    if (cell.status === "Pending") return `bg-amber-50 border-amber-300 ${adminCursor} ${baseBorder}`;
    if (cell.role === "Staff") return `bg-purple-50 border-purple-300 ${adminCursor} ${baseBorder}`;
    return `bg-blue-50 border-blue-300 ${adminCursor} ${baseBorder}`; 
  };

  const getCellContent = (cell) => {
    if (!cell) {
      // Only show "Book" button if NOT Read Only
      if (isReadOnly) return null;
      return (
        <div className="flex items-center justify-center h-full">
          <span className="text-emerald-600/0 group-hover:text-emerald-600 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
            Book
          </span>
        </div>
      );
    }

    const isMine = currentUser && cell.creatorName === currentUser.name;

    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-1 animate-fade-in relative">
        {isMine && !isReadOnly && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" title="Your Booking"></span>
        )}
        <span className={`font-bold text-xs truncate w-full text-center ${isMine ? 'text-indigo-700' : 'text-gray-800'}`}>
          {isMine ? "YOU" : cell.creatorName}
        </span>
        <span className="text-[10px] text-gray-500 truncate max-w-[90%] italic">
          {cell.purpose}
        </span>
        <div className={`mt-1 text-[9px] px-2 py-0.5 rounded-full font-medium shadow-sm bg-white/80 backdrop-blur-sm ${
          cell.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'
        }`}>
          {cell.status}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      
      {/* ✅ SUBTLE INDICATOR FOR PAST DATES (No Block Overlay) */}
      {isReadOnly && (
        <div className="absolute top-0 right-0 z-20 bg-slate-100 text-slate-400 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest border-l border-b border-slate-200 pointer-events-none">
          Past Date • View Only
        </div>
      )}

      <div className={`overflow-hidden rounded-2xl shadow-xl border border-gray-200 bg-white ring-1 ring-gray-100 ${isReadOnly ? 'opacity-95' : ''}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 bg-slate-900 text-white text-left min-w-[140px] sticky left-0 z-20 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.3)]">
                  <span className="text-sm font-bold tracking-wider uppercase flex items-center gap-2">💻 Labs</span>
                </th>
                {periods.map((p) => (
                  <th key={p} className={`p-3 text-center min-w-[110px] border-b-4 transition-colors ${p===3 || p===6 ? "bg-slate-100 border-slate-300 text-slate-400" : "bg-slate-50 border-indigo-500/20 text-slate-600"}`}>
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={`text-xs font-extrabold ${p===3 || p===6 ? "tracking-widest" : ""}`}>{p === 3 ? "☕ BREAK" : p === 6 ? "🍽️ LUNCH" : `PERIOD ${p}`}</span>
                      <span className="text-[10px] font-medium opacity-60 mt-1">{PERIOD_LABELS[p]}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labs.map((lab) => (
                <tr key={lab.code} className="border-b border-gray-100 last:border-none group hover:bg-slate-50/30 transition-colors">
                  <td className="p-4 bg-white font-bold text-slate-700 sticky left-0 z-10 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] group-hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-lg text-indigo-600">{lab.code}</span>
                      <span className="text-[10px] text-gray-400 font-normal uppercase tracking-wide">{lab.name}</span>
                    </div>
                  </td>

                  {/* ✅ MAINTENANCE MODE ROW (Blocks booking) */}
                  {lab.isMaintenance ? (
                    <td colSpan={periods.length} className="bg-slate-50 border-slate-200 text-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)'}}></div>
                      <div className="relative z-10 flex items-center justify-center gap-2 text-slate-600 font-bold tracking-widest text-sm opacity-70">
                        <span>⛔ MAINTENANCE</span>
                        <span className="text-xs bg-slate-200 px-2 py-1 rounded border border-slate-300 font-mono text-slate-700">
                          {lab.maintenanceReason || "Scheduled"}
                        </span>
                      </div>
                    </td>
                  ) : (
                    periods.map((p) => {
                      if (p === 3 || p === 6) {
                        return <td key={`${lab.code}-${p}`} className="bg-slate-100/50 p-0 relative overflow-hidden"><div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} /></td>;
                      }
                      const cellData = schedule[lab.code]?.[p];
                      return (
                        <td
                          key={`${lab.code}-${p}`}
                          // ✅ PREVENT CLICK IF READ ONLY
                          onClick={() => !isReadOnly && (!cellData || isAdmin) ? onSlotClick(lab, p, cellData) : null}
                          className={`h-28 p-1 border-r border-dashed border-gray-100 relative transition-all duration-200 ease-out ${getCellStyle(cellData)}`}
                        >
                          {getCellContent(cellData)}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}