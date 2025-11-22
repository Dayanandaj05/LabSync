import React from "react";

export default function LogsViewer({ logs = [] }) {
  return (
    <div className="backdrop-blur-md bg-white/40 border border-white/50 rounded-xl shadow-lg p-6 max-h-[400px] overflow-hidden flex flex-col transition-all hover:shadow-xl">
      <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
        📢 Live Activity Log
        <span className="text-xs font-normal text-gray-600 bg-white/50 px-2 py-1 rounded-full border border-gray-200">
          Real-time
        </span>
      </h3>

      {logs.length === 0 ? (
        <div className="text-gray-500 italic text-sm text-center py-4">No recent activity</div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {logs.map((log) => (
            <div key={log._id} className="text-sm border-b border-gray-200/50 pb-2 last:border-0 hover:bg-white/30 p-2 rounded transition-colors">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-gray-900">{formatAction(log.action)}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-gray-700 mt-1 break-words">
                {formatMeta(log.meta)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to make logs readable
function formatAction(action) {
  return action.replace(/([A-Z])/g, ' $1').trim(); // "UserLoggedIn" -> "User Logged In"
}

function formatMeta(meta) {
  if (!meta) return "";
  // Custom formatting for common meta fields
  if (meta.email) return `User: ${meta.email}`;
  if (meta.lab && meta.period) return `Lab ${meta.lab}, Period ${meta.period}`;
  if (meta.bookingId) return `Booking ID: ...${meta.bookingId.slice(-4)}`;
  
  return JSON.stringify(meta).replace(/[{}"]/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
}