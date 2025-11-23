import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function RecurringBooking() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [labCode, setLabCode] = useState("CC");
  const [selectedPeriods, setSelectedPeriods] = useState([]); 
  const [purpose, setPurpose] = useState("");
  const [type, setType] = useState("Regular");
  
  // ✅ BANNER OPTIONS
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerColor, setBannerColor] = useState("indigo");

  const [startDate, setStartDate] = useState("");
  const [weeks, setWeeks] = useState(1);
  const [manualDate, setManualDate] = useState(""); 
  const [generatedDates, setGeneratedDates] = useState([]);

  if (!['Admin', 'Staff'].includes(user.role)) return <div className="p-10 text-center text-red-500">Access Denied.</div>;

  const togglePeriod = (p) => {
    setSelectedPeriods(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p].sort((a,b)=>a-b));
  };

  const handleGenerateDates = () => {
    if (type === 'Regular') {
      if (!startDate || weeks < 1) return;
      const dates = [];
      let current = new Date(startDate);
      for (let i = 0; i < weeks; i++) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 7);
      }
      setGeneratedDates(dates);
    } else {
      if (!manualDate) return;
      if (!generatedDates.includes(manualDate)) {
        setGeneratedDates([...generatedDates, manualDate].sort());
      }
      setManualDate("");
    }
  };

  const removeDate = (d) => setGeneratedDates(prev => prev.filter(date => date !== d));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (generatedDates.length === 0) return alert("Please select at least one date.");
    if (selectedPeriods.length === 0) return alert("Please select at least one period.");

    try {
      const token = localStorage.getItem("token");
      await API.post('/api/bookings/recurring', {
        labCode,
        periods: selectedPeriods, 
        purpose,
        type,
        dates: generatedDates,
        bannerVisible,
        bannerColor
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert("Recurring booking successful!");
      navigate("/admin");
    } catch (err) { alert(err.response?.data?.error || "Failed to book"); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{type === 'Regular' ? '🔄 Recurring Booking' : '📝 Test / Event Scheduler'}</h1>
            <p className="text-slate-400 text-sm">Bulk schedule classes, tests, or events.</p>
          </div>
          <div className="text-4xl opacity-20">📅</div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* TYPE SELECTOR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b pb-6">
            {['Regular', 'Test', 'Project Review', 'Event'].map(t => (
              <button 
                key={t} 
                type="button" 
                onClick={() => { setType(t); setGeneratedDates([]); }} 
                className={`py-2 rounded-lg font-bold border text-xs transition-all ${type===t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* CONFIG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Lab & Purpose</label>
              <select value={labCode} onChange={e => setLabCode(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 font-bold mb-3">
                <option value="CC">Computer Center (CC)</option><option value="IS">Information Systems (IS)</option><option value="CAT">CAT Lab</option>
              </select>
              <input type="text" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Course Name / Event Title" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              
              {/* Banner Options for Events */}
              {['Event', 'Test', 'Project Review'].includes(type) && (
                 <div className="flex items-center gap-4 mt-3 bg-slate-50 p-2 rounded border">
                   <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                     <input type="checkbox" checked={bannerVisible} onChange={e => setBannerVisible(e.target.checked)} /> Show in Banner
                   </label>
                   {bannerVisible && (
                     <select value={bannerColor} onChange={e => setBannerColor(e.target.value)} className="text-xs border rounded p-1">
                       <option value="indigo">Indigo</option><option value="pink">Pink</option><option value="green">Green</option><option value="red">Red</option>
                     </select>
                   )}
                 </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Period(s)</label>
              <div className="flex flex-wrap gap-2">
                {[1,2,3,4,5,6,7,8,9,10].map(p => (
                  <button key={p} type="button" onClick={() => togglePeriod(p)} className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${selectedPeriods.includes(p) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DATES */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
             <div className="flex flex-col md:flex-row gap-4 items-end">
              {type === 'Regular' ? (
                <>
                  <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded bg-white" /></div>
                  <div className="w-24"><label className="block text-xs font-bold text-slate-500 mb-1">Weeks</label><input type="number" min="1" max="20" value={weeks} onChange={e => setWeeks(e.target.value)} className="w-full p-2 border rounded bg-white" /></div>
                  <button type="button" onClick={handleGenerateDates} className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm">Generate</button>
                </>
              ) : (
                <>
                  <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Pick Date</label><input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full p-2 border rounded bg-white" /></div>
                  <button type="button" onClick={handleGenerateDates} className="bg-purple-600 text-white px-6 py-2 rounded font-bold text-sm">+ Add Date</button>
                </>
              )}
            </div>
             {/* Preview Dates */}
            {generatedDates.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {generatedDates.map(d => (
                  <div key={d} className="bg-white text-slate-700 border border-slate-300 px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 shadow-sm">
                    {d} <button type="button" onClick={() => removeDate(d)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black shadow-lg transition-all">
            Confirm Booking ({generatedDates.length * selectedPeriods.length} Slots)
          </button>
        </form>
      </div>
    </div>
  );
}