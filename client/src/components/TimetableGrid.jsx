import React from "react";

const PERIOD_LABELS = {
  1: "8:30 - 9:20",
  2: "9:20 - 10:10",
  3: "10:10 - 10:30 (Break)",
  4: "10:30 - 11:20",
  5: "11:20 - 12:10",
  6: "12:10 - 1:40 (Lunch)",
  7: "1:40 - 2:30",
  8: "2:30 - 3:20",
  9: "3:20 - 4:30",
};

export default function TimetableGrid({ gridData, onSlotClick }) {
  const { labs, schedule } = gridData;
  const periods = Object.keys(PERIOD_LABELS).map(Number);

  // Helper to get cell style based on status
  const getCellStyle = (cell) => {
    if (!cell) return "bg-green-50 hover:bg-green-100 cursor-pointer"; // Free
    if (cell.status === "Pending") return "bg-yellow-100 border-yellow-300 cursor-not-allowed";
    if (cell.status === "Rejected") return "bg-red-100 cursor-not-allowed"; // Or treat as free depending on logic
    
    // Approved
    if (cell.role === "Staff") return "bg-purple-100 border-purple-300 cursor-not-allowed";
    return "bg-blue-100 border-blue-300 cursor-not-allowed"; // Student Approved
  };

  const getCellContent = (cell) => {
    if (!cell) return <span className="text-green-600 text-xs font-bold">Available</span>;
    
    const icons = {
      "Project Work": "💻",
      "Study Session": "📚",
      "Placement Prep": "💼",
      "Extra Class": "🎓",
      "Workshop": "🛠️"
    };

    return (
      <div className="flex flex-col items-center justify-center h-full text-xs">
        <span>{icons[cell.purpose] || "📅"}</span>
        <span className="font-semibold truncate w-full px-1">{cell.creatorName}</span>
        <span className="text-[10px] opacity-75">{cell.status}</span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto pb-4">
      <table className="min-w-full border-collapse border border-gray-200 bg-white shadow-sm rounded-lg overflow-hidden">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="p-3 border border-gray-700 text-left w-32 sticky left-0 bg-gray-800 z-10">Lab</th>
            {periods.map((p) => (
              <th key={p} className="p-2 border border-gray-700 text-center text-xs font-medium w-28">
                P{p} <br /> <span className="opacity-50 text-[10px]">{PERIOD_LABELS[p]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labs.map((lab) => (
            <tr key={lab.code} className="hover:bg-gray-50">
              <td className="p-3 border border-gray-200 font-bold text-gray-700 sticky left-0 bg-white z-10 shadow-sm">
                {lab.code}
              </td>
              {periods.map((p) => {
                const cellData = schedule[lab.code]?.[p];
                return (
                  <td
                    key={`${lab.code}-${p}`}
                    className={`border border-gray-200 text-center h-20 w-28 transition-all relative ${getCellStyle(cellData)}`}
                    onClick={() => !cellData && onSlotClick(lab, p)}
                  >
                    {getCellContent(cellData)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}