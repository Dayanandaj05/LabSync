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
  10: "Extra Slot",
};

export default function TimetableGrid({ timetable, onSlotClick }) {
  const labs = Object.keys(timetable);
  const periods = Object.keys(PERIOD_LABELS);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded bg-white shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 border text-left">Lab</th>
            {periods.map((p) => (
              <th key={p} className="p-3 border text-center text-sm font-medium">
                {PERIOD_LABELS[p]}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {labs.map((lab) => (
            <tr key={lab} className="border">
              <td className="p-3 border font-semibold bg-gray-50">{lab}</td>

              {periods.map((p) => {
                const status = timetable[lab][p];

                const baseStyle =
                  "p-3 border text-center text-sm cursor-pointer transition";

                let color =
                  status === "Free"
                    ? "bg-green-100 hover:bg-green-200"
                    : status === "Blocked"
                    ? "bg-red-200"
                    : "bg-gray-200";

                return (
                  <td
                    key={p}
                    className={`${baseStyle} ${color}`}
                    onClick={() => {
                      if (status === "Free") onSlotClick(lab, Number(p));
                    }}
                  >
                    {status}
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
