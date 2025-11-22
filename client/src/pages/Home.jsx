import React, { useEffect, useState } from "react";
import { getFreeLabs, createBooking, getLogs } from "../services/api";

import TimetableGrid from "../components/TimetableGrid";

export default function Home() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [free, setFree] = useState([]);
  const [logs, setLogs] = useState([]);

  async function load() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await getFreeLabs(date);
    setFree(res.free || []);

    const lg = await getLogs(10);
    setLogs(lg.logs || []);
  }

  useEffect(() => {
    load();
  }, [date]);

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <button
          className="bg-gray-900 text-white px-4 py-2 rounded"
          onClick={load}
        >
          Refresh
        </button>
      </div>

      <TimetableGrid date={date} freeLabs={free} logs={logs} />
    </div>
  );
}
