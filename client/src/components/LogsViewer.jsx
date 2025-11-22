import React from "react";

export default function LogsViewer({ logs = [] }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-8">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          📢 Recent Activity
        </h3>
        <span className="text-xs text-slate-500">Live Updates</span>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-slate-400 text-sm italic text-center py-8">No recent activity recorded.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white sticky top-0 z-10">
              <tr>
                <th className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Log Time</th>
                <th className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Booking Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Log Time */}
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  
                  {/* User */}
                  <td className="px-6 py-3 font-medium text-slate-700">
                    {log.user?.name || "System"}
                  </td>

                  {/* Action */}
                  <td className="px-6 py-3">
                    <ActionBadge action={log.action} />
                  </td>

                  {/* Details (Lab, Date, Period) */}
                  <td className="px-6 py-3 text-slate-600">
                    {formatDetails(log.meta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }) {
  let colorClass = "bg-gray-100 text-gray-600";
  let label = action.replace(/([A-Z])/g, ' $1').trim();

  if (action.includes("Created") || action.includes("Pending")) {
    colorClass = "bg-yellow-100 text-yellow-700 border border-yellow-200";
    label = "New Request";
  } else if (action.includes("Approved")) {
    colorClass = "bg-green-100 text-green-700 border border-green-200";
    label = "Approved";
  } else if (action.includes("Rejected")) {
    colorClass = "bg-red-100 text-red-700 border border-red-200";
    label = "Rejected";
  } else if (action.includes("Override")) {
    colorClass = "bg-orange-100 text-orange-800 border border-orange-200";
    label = "Admin Override";
  }

  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${colorClass}`}>
      {label}
    </span>
  );
}

function formatDetails(meta) {
  if (!meta) return "-";
  
  // If we have specific booking info, show Lab, Date, and Period
  if (meta.lab && meta.period) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="font-bold text-indigo-600">Lab {meta.lab}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium text-slate-700">{meta.date}</span>
        <span className="text-slate-300">|</span>
        <span>Period {meta.period}</span>
      </span>
    );
  }

  const cleanMeta = JSON.stringify(meta).replace(/[{}"]/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
  return <span className="opacity-70 text-xs truncate max-w-[200px] block">{cleanMeta}</span>;
}