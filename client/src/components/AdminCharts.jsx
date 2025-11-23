import React from "react";

export function BarChart({ data, title, color = "blue" }) {
  // Find max value for scaling, avoid division by zero
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const colorStyles = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">
        {title}
      </h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="group">
            <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${colorStyles[color]} transition-all duration-1000 ease-out group-hover:opacity-80`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    emerald: "from-emerald-500 to-emerald-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-6 rounded-2xl shadow-lg text-white relative overflow-hidden`}>
      <div className="relative z-10">
        <h3 className="text-xs font-bold opacity-80 uppercase tracking-wider">{title}</h3>
        <p className="text-4xl font-extrabold mt-2">{value}</p>
      </div>
      <div className="absolute right-0 bottom-0 opacity-10 text-8xl leading-none transform translate-x-2 translate-y-2">
        {icon}
      </div>
    </div>
  );
}