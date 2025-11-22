import React from "react";

export default function LogsViewer({ logs = [] }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>

      {logs.length === 0 && (
        <div className="text-gray-500">No activity yet</div>
      )}

      <div className="space-y-4 max-h-64 overflow-auto">
        {logs.map((log) => (
          <div key={log._id} className="border-b pb-3">
            <div className="text-xs text-gray-500">
              {new Date(log.timestamp).toLocaleString()}
            </div>
            <div className="font-medium text-gray-900">{log.action}</div>
            <div className="text-sm text-gray-600">
              {JSON.stringify(log.meta)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
