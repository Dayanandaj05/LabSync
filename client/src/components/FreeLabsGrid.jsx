import React from "react";

export default function FreeLabsGrid({ free, onBookClick }) {
  if (!free || free.length === 0) return <p>No free labs available</p>;

  const periods = [1,2,3,4,5,6,7,8,9,10];

  return (
    <div className="space-y-6">
      {free.map((lab) => (
        <div key={lab.lab} className="border rounded-lg bg-white shadow-sm p-4">
          <h2 className="font-semibold text-lg mb-3">{lab.lab} — {lab.name}</h2>

          <div className="grid grid-cols-5 gap-3">
            {periods.map((p) => {
              const isFree = lab.freePeriods.includes(p);

              return (
                <button
                  key={p}
                  disabled={!isFree}
                  onClick={() => onBookClick(lab.lab, p)}
                  className={`py-2 rounded text-sm border ${
                    isFree
                      ? "bg-green-100 hover:bg-green-200"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Period {p}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
