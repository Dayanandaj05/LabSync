import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function RecurringBooking() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [labCode, setLabCode] = useState("CC");
  const [selectedPeriods, setSelectedPeriods] = useState([]); 
  const [purpose, setPurpose] = useState("");
  const [type, setType] = useState("Regular");
  
  // ✅ Banner & Subject Options
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerColor, setBannerColor] = useState("indigo");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");

  // ✅ New Semester Logic
  const [selectedDay, setSelectedDay] = useState(null); // 1=Mon, 2=Tue...
  const [manualDate, setManualDate] = useState(""); 
  const [generatedDates, setGeneratedDates] = useState([]);

  // Load Subjects if Staff
  useEffect(() => {
    if (user.role === 'Staff') {
       API.get('/api/public/subjects').then(res => setSubjects(res.data.subjects || []));
    }
  }, [user.role]);

  if (!['Admin', 'Staff'].includes(user.role)) return <div className="p-10 text-center text-red-500">Access Denied.</div>;

  // Toggle Period Selection
  const togglePeriod = (p) => {
    setSelectedPeriods(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p].sort((a,b)=>a-b));
  };

  // ✅ AUTO-GENERATE SEMESTER DATES
  const handleDaySelect = (dayIndex) => {
     setSelectedDay(dayIndex);
     
     // 1. Find next occurrence of this day
     const today = new Date();
     const resultDate = new Date();
     resultDate.setDate(today.getDate() + (dayIndex + 7 - today.getDay()) % 7);
     
     // 2. Generate for 20 Weeks (Approx Semester)
     const dates = [];
     for(let i=0; i<20; i++) {
        dates.push(resultDate.toISOString().slice(0, 10));
        resultDate.setDate(resultDate.getDate() + 7);
     }
     setGeneratedDates(dates);
  };

  // Manual Date Add (For Tests/Events)
  const handleAddManualDate = () => {
     if (!manualDate) return;
     if (!generatedDates.includes(manualDate)) {
       setGeneratedDates([...generatedDates, manualDate].sort());
     }
     setManualDate("");
  };

  const removeDate = (d) => setGeneratedDates(prev => prev.filter(date => date !== d));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (generatedDates.length === 0) return alert("Please select a day or add dates.");
    if (selectedPeriods.length === 0) return alert("Please select at least one period.");
    
    // ✅ Staff Subject Validation
    if (user.role === 'Staff' && !selectedSubject) return alert("Please select a Subject.");

    try {
      const token = localStorage.getItem("token");
      const res = await API.post('/api/bookings/recurring', {
        labCode,
        periods: selectedPeriods, 
        purpose,
        type,
        dates: generatedDates,
        subjectId: selectedSubject || null,
        showInBanner: bannerVisible,
        bannerColor
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert(res.data.message || "Booking successful!");
      navigate("/admin");
    } catch (err) { alert(err.response?.data?.error || "Failed to book"); }
  };

  const daysOfWeek = [
    { name: 'Mon', index: 1 },
    { name: 'Tue', index: 2 },
    { name: 'Wed', index: 3 },
    { name: 'Thu', index: 4 },
    { name: 'Fri', index: 5 }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{type === 'Regular' ? '📅 Semester Scheduler' : '📝 Event Scheduler'}</h1>
            <p className="text-slate-400 text-sm">
              {type === 'Regular' ? 'Book a slot for the entire semester.' : 'Schedule specific dates for tests or events.'}
            </p>
          </div>
          <div className="text-4xl opacity-20">🔄</div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* TYPE SELECTOR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b pb-6">
            {['Regular', 'Test', 'Project Review', 'Event'].map(t => (
              <button 
                key={t} 
                type="button" 
                onClick={() => { setType(t); setGeneratedDates([]); setSelectedDay(null); }} 
                className={`py-2 rounded-lg font-bold border text-xs transition-all ${type===t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* CONFIG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Lab & Subject</label>
              <select value={labCode} onChange={e => setLabCode(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 font-bold mb-3">
                <option value="CC">Computer Center (CC)</option><option value="IS">Information Systems (IS)</option><option value="CAT">CAT Lab</option>
              </select>
              
              {/* ✅ Subject Dropdown */}
              {user.role === 'Staff' && (
                 <select required value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-3 border border-purple-300 bg-purple-50 rounded-lg font-bold mb-3 focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value="">-- Select Subject --</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
                 </select>
              )}

              <input type="text" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Description / Title" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              
              {/* Banner Options */}
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

          {/* DATES GENERATION */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
             
             {type === 'Regular' ? (
                // ✅ SEMESTER MODE: Day Picker
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Select Weekly Day (Books till End of Semester)</label>
                   <div className="flex gap-4">
                      {daysOfWeek.map(day => (
                         <button 
                            key={day.name} 
                            type="button" 
                            onClick={() => handleDaySelect(day.index)}
                            className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all shadow-sm ${
                               selectedDay === day.index 
                               ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200' 
                               : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                         >
                            {day.name}
                         </button>
                      ))}
                   </div>
                   {generatedDates.length > 0 && (
                      <div className="mt-4 text-xs text-slate-500 text-center">
                         ✅ Generated <span className="font-bold text-slate-800">{generatedDates.length} bookings</span> (from {generatedDates[0]} to {generatedDates[generatedDates.length-1]})
                      </div>
                   )}
                </div>
             ) : (
                // ✅ MANUAL MODE: Date Picker
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Pick Date</label><input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full p-2 border rounded bg-white" /></div>
                  <button type="button" onClick={handleAddManualDate} className="bg-purple-600 text-white px-6 py-2 rounded font-bold text-sm">+ Add Date</button>
                </div>
             )}

             {/* Preview Dates (Only for Manual Mode or verification) */}
             {type !== 'Regular' && generatedDates.length > 0 && (
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