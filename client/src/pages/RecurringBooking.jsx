import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function RecurringBooking() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Form State
  const [labCode, setLabCode] = useState("CC");
  const [selectedPeriods, setSelectedPeriods] = useState([]); 
  const [purpose, setPurpose] = useState("");
  const [type, setType] = useState("Regular");
  
  // Date Logic
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
      const res = await API.post('/api/bookings/recurring', {
        labCode,
        periods: selectedPeriods, 
        purpose,
        type,
        dates: generatedDates
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert(res.data.message);
      
      // ✅ FIX: Redirect to Home Page set to the FIRST booked date
      if (generatedDates.length > 0) {
        navigate(`/?date=${generatedDates[0]}`);
      } else {
        navigate("/");
      }

    } catch (err) {
      alert(err.response?.data?.error || "Failed to book");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {type === 'Regular' ? '🔄 Recurring Class Booking' : '📝 Exam / Test Scheduler'}
            </h1>
            <p className="text-slate-400 text-sm">
              {type === 'Regular' ? 'Book weekly slots automatically.' : 'Book specific dates for exams.'}
            </p>
          </div>
          <div className="text-4xl opacity-20">{type === 'Regular' ? '📅' : '🎓'}</div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* TYPE SELECTOR */}
          <div className="flex gap-4 border-b pb-6">
            <button type="button" onClick={() => { setType('Regular'); setGeneratedDates([]); }} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${type==='Regular' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-transparent bg-slate-100 text-slate-500'}`}>
              Routine Class (Weekly)
            </button>
            <button type="button" onClick={() => { setType('Test'); setGeneratedDates([]); }} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${type==='Test' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-transparent bg-slate-100 text-slate-500'}`}>
              Exam / Test (Specific Dates)
            </button>
          </div>

          {/* LAB & PERIODS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Lab</label>
              <select value={labCode} onChange={e => setLabCode(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 font-bold">
                <option value="CC">Computer Center (CC)</option>
                <option value="IS">Information Systems (IS)</option>
                <option value="CAT">CAT Lab</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Period(s)</label>
              <div className="flex flex-wrap gap-2">
                {[1,2,3,4,5,6,7,8,9,10].map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => togglePeriod(p)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all ${
                      selectedPeriods.includes(p) 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">Click multiple periods to book back-to-back slots.</p>
            </div>
          </div>

          {/* PURPOSE */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Purpose / Course Name</label>
            <input type="text" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder={type === 'Regular' ? "e.g. CS302 Data Structures Lab" : "e.g. Internal Assessment 1"} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {/* DATE SELECTION LOGIC */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="text-slate-800 font-bold mb-4 text-sm uppercase tracking-wide">
              {type === 'Regular' ? 'Weekly Pattern' : 'Add Exam Dates'}
            </h3>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {type === 'Regular' ? (
                <>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded bg-white" />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Weeks</label>
                    <input type="number" min="1" max="20" value={weeks} onChange={e => setWeeks(e.target.value)} className="w-full p-2 border rounded bg-white" />
                  </div>
                  <button type="button" onClick={handleGenerateDates} className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-700">
                    Generate
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Pick Date</label>
                    <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full p-2 border rounded bg-white" />
                  </div>
                  <button type="button" onClick={handleGenerateDates} className="bg-purple-600 text-white px-6 py-2 rounded font-bold text-sm hover:bg-purple-700">
                    + Add Date
                  </button>
                </>
              )}
            </div>

            {/* Selected Dates Preview */}
            {generatedDates.length > 0 && (
              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Selected Dates ({generatedDates.length})</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {generatedDates.map(d => (
                    <div key={d} className="bg-white text-slate-700 border border-slate-300 px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2 shadow-sm">
                      {d}
                      <button type="button" onClick={() => removeDate(d)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                    </div>
                  ))}
                </div>
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