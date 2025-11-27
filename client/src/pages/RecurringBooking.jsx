import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function RecurringBooking() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Mode State
  const [mode, setMode] = useState("Regular"); // Regular | Test | Semester Exam
  
  // --- COMMON STATE ---
  const [labCode, setLabCode] = useState("CC");
  const [selectedPeriods, setSelectedPeriods] = useState([]); 
  const [subjects, setSubjects] = useState([]);
  
  // --- REGULAR MODE STATE ---
  const [purpose, setPurpose] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [generatedDates, setGeneratedDates] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [semesterStart, setSemesterStart] = useState("");
  const [semesterEnd, setSemesterEnd] = useState("");

  // --- EXAM BATCH STATE ---
  const [examDate, setExamDate] = useState("");
  
  // Dropdown State logic
  const [selectedExamType, setSelectedExamType] = useState("");
  const [customExamName, setCustomExamName] = useState("");
  
  const [examQueue, setExamQueue] = useState([]); 

  // OPTIONS CONSTANTS
  const TEST_OPTIONS = ["CA 1", "CA 2", "Other"];
  const SEMESTER_OPTIONS = ["Semester Practical", "Project Review", "Other"];

  useEffect(() => {
    if (user.role === 'Staff') {
       API.get('/api/public/subjects').then(res => setSubjects(res.data.subjects || []));
    }
  }, [user.role]);

  if (!['Admin', 'Staff'].includes(user.role)) return <div className="p-10 text-center text-red-500">Access Denied.</div>;

  // --- HELPER: PERIODS ---
  const togglePeriod = (p) => {
    setSelectedPeriods(prev => prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p].sort((a,b)=>a-b));
  };

  // --- LOGIC: REGULAR SEMESTER ---
  const handleDaySelect = (dayIndex) => {
     setSelectedDay(dayIndex);
     if (semesterStart && semesterEnd) {
       generateSemesterDates(dayIndex);
     } else {
       const today = new Date();
       const resultDate = new Date();
       resultDate.setDate(today.getDate() + (dayIndex + 7 - today.getDay()) % 7);
       const dates = [];
       for(let i=0; i<20; i++) {
          dates.push(resultDate.toISOString().slice(0, 10));
          resultDate.setDate(resultDate.getDate() + 7);
       }
       setGeneratedDates(dates);
     }
  };

  const generateSemesterDates = (dayIndex) => {
    if (!semesterStart || !semesterEnd) return;
    const start = new Date(semesterStart);
    const end = new Date(semesterEnd);
    const dates = [];
    
    // Find first occurrence of selected day
    const current = new Date(start);
    while (current.getDay() !== dayIndex && current <= end) {
      current.setDate(current.getDate() + 1);
    }
    
    // Generate weekly dates
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 7);
    }
    
    setGeneratedDates(dates);
  };

  // --- LOGIC: EXAM QUEUE ---
  const addToQueue = () => {
      // 1. Determine Final Name
      let finalExamName = selectedExamType;
      if (selectedExamType === "Other") {
          finalExamName = customExamName.trim();
      }

      // 2. Validation
      if(!examDate || selectedPeriods.length === 0 || !finalExamName || (user.role === 'Staff' && !selectedSubject)) {
          return alert("Please fill all details (Date, Periods, Name, Subject).");
      }
      
      // 3. Sunday Check
      const examDateObj = new Date(examDate);
      if (examDateObj.getDay() === 0) {
          return alert("Tests and exams cannot be scheduled on Sundays.");
      }

      const newEntry = {
          id: Date.now(),
          labCode,
          date: examDate,
          periods: [...selectedPeriods],
          purpose: `${mode}: ${finalExamName}`, 
          type: mode, 
          subjectId: selectedSubject || null,
          subjectName: subjects.find(s => s._id === selectedSubject)?.name || "N/A"
      };

      setExamQueue(prev => [...prev, newEntry].sort((a,b) => new Date(a.date) - new Date(b.date)));
      
      // 3. Reset Inputs
      setSelectedPeriods([]);
  };

  const removeFromQueue = (id) => {
      setExamQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleModeSwitch = (newMode) => {
      setMode(newMode);
      setExamQueue([]);
      setSelectedExamType("");
      setCustomExamName("");
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
        if (mode === 'Regular') {
            if (generatedDates.length === 0 || selectedPeriods.length === 0) return alert("Incomplete data.");
            await API.post('/api/bookings/recurring', {
                labCode, periods: selectedPeriods, purpose, type: 'Regular', dates: generatedDates,
                subjectId: selectedSubject || null, showInBanner: false
            }, { headers: { Authorization: `Bearer ${token}` } });
        } else {
            if (examQueue.length === 0) return alert("Queue is empty. Add exams first.");
            await API.post('/api/bookings/recurring', { batch: examQueue }, { headers: { Authorization: `Bearer ${token}` } });
        }

        alert("Schedule Created Successfully!");
        navigate("/admin");
    } catch (err) { alert(err.response?.data?.error || "Failed"); }
  };

  const daysOfWeek = [{ name: 'Mon', index: 1 }, { name: 'Tue', index: 2 }, { name: 'Wed', index: 3 }, { name: 'Thu', index: 4 }, { name: 'Fri', index: 5 }, { name: 'Sat', index: 6 }];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className={`${mode === 'Semester Exam' ? 'bg-red-900' : mode === 'Test' ? 'bg-purple-900' : 'bg-slate-900'} p-6 text-white flex justify-between items-center transition-colors duration-500`}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                {/* ✅ CHANGED HEADING HERE */}
                {mode === 'Regular' && <span>📅 Book for a Class Test</span>}
                {mode === 'Test' && <span>📝 Internal / CA Scheduler</span>}
                {mode === 'Semester Exam' && <span>🎓 Semester Exam Scheduler</span>}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {mode === 'Regular' ? '' : 'Queue up multiple exams and submit in one batch.'}
            </p>
          </div>
          <div className="text-4xl opacity-20">
              {mode === 'Regular' ? '🔄' : '📚'}
          </div>
        </div>

        <div className="p-8">
          
          {/* 1. TYPE SELECTOR */}
          <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit">
            {['Regular', 'Test', 'Semester Exam'].map(t => (
              <button 
                key={t} 
                onClick={() => handleModeSwitch(t)} 
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${mode===t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- LEFT COLUMN: INPUTS --- */}
            <div className="lg:col-span-1 space-y-6">
               
               {/* Lab Selector */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Lab</label>
                  <select value={labCode} onChange={e => setLabCode(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 font-bold">
                    <option value="CC">Computer Center (CC)</option><option value="IS">Information Systems (IS)</option><option value="CAT">CAT Lab</option>
                  </select>
               </div>

               {/* Subject Selector (Staff/Admin) */}
               {user.role === 'Staff' && (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                    <select required value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-3 border border-indigo-200 bg-indigo-50/50 rounded-lg font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- Select Subject --</option>
                      {subjects.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
                    </select>
                 </div>
               )}

               {/* Dynamic Inputs based on Mode */}
               {mode === 'Regular' ? (
                   <div className="space-y-4 animate-fade-in">
                       <div className="grid grid-cols-2 gap-3">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Semester Start</label>
                               <input type="date" value={semesterStart} onChange={e => {setSemesterStart(e.target.value); if(selectedDay !== null) generateSemesterDates(selectedDay);}} className="w-full p-2 border rounded-lg" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Semester End</label>
                               <input type="date" value={semesterEnd} onChange={e => {setSemesterEnd(e.target.value); if(selectedDay !== null) generateSemesterDates(selectedDay);}} className="w-full p-2 border rounded-lg" />
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Day of Week</label>
                           <div className="flex gap-2">
                               {daysOfWeek.map(day => (
                                   <button key={day.name} onClick={() => handleDaySelect(day.index)} type="button" className={`flex-1 py-2 rounded border text-xs font-bold ${selectedDay === day.index ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{day.name}</button>
                               ))}
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class / Purpose</label>
                           <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="e.g. 2nd Year MCA Lab" />
                       </div>
                   </div>
               ) : (
                   <div className="space-y-4 animate-fade-in">
                       <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                           <label className="block text-xs font-bold text-yellow-800 uppercase mb-1">Exam Date</label>
                           <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full p-2 border rounded bg-white font-bold" />
                       </div>
                       
                       {/* DYNAMIC DROPDOWN FOR EXAM NAMES */}
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exam Type</label>
                           <select 
                              value={selectedExamType} 
                              onChange={e => setSelectedExamType(e.target.value)} 
                              className="w-full p-3 border rounded-lg bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                           >
                              <option value="">-- Select --</option>
                              {mode === 'Test' 
                                 ? TEST_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                 : SEMESTER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)
                              }
                           </select>
                       </div>

                       {/* CUSTOM INPUT IF 'OTHER' */}
                       {selectedExamType === 'Other' && (
                           <div className="animate-fade-in">
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specify Name</label>
                               <input 
                                  type="text" 
                                  value={customExamName} 
                                  onChange={e => setCustomExamName(e.target.value)} 
                                  className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                  placeholder="Enter title..." 
                                  autoFocus
                               />
                           </div>
                       )}
                       
                       {/* SUBJECT SELECTOR FOR TESTS ONLY */}
                       {(mode === 'Test' || mode === 'Semester Exam') && (
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                             <select required value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-3 border border-purple-200 bg-purple-50/50 rounded-lg font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500">
                               <option value="">-- Select Subject --</option>
                               {subjects.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
                             </select>
                         </div>
                       )}
                   </div>
               )}

               {/* Period Selector */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Periods</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1,2,3,4,5,6,7,8,9,10].map(p => (
                      <button key={p} type="button" onClick={() => togglePeriod(p)} className={`h-10 rounded text-sm font-bold border transition-all ${selectedPeriods.includes(p) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:border-indigo-300'}`}>{p}</button>
                    ))}
                  </div>
               </div>

               {/* Action Button */}
               {mode === 'Regular' ? (
                   <button onClick={handleSubmit} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black">Confirm Semester Schedule</button>
               ) : (
                   <button onClick={addToQueue} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700 flex items-center justify-center gap-2">
                       <span>+ Add to Queue</span>
                   </button>
               )}

            </div>

            {/* --- RIGHT COLUMN: PREVIEW / QUEUE --- */}
            <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col min-h-[400px]">
                
                {mode === 'Regular' ? (
                    <div className="text-center h-full flex flex-col items-center justify-center text-slate-400">
                        {generatedDates.length > 0 ? (
                            <div className="text-left w-full max-w-xs">
                                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Summary</h3>
                                <p className="text-sm">📅 <strong>{generatedDates.length} Classes</strong></p>
                                <p className="text-sm">🚀 Starts: <strong>{generatedDates[0]}</strong></p>
                                <p className="text-sm">🏁 Ends: <strong>{generatedDates[generatedDates.length-1]}</strong></p>
                                <p className="text-sm">⏰ Periods: <strong>{selectedPeriods.join(", ")}</strong></p>
                                {semesterStart && semesterEnd && <p className="text-sm text-green-600">📚 <strong>Semester Duration</strong></p>}
                            </div>
                        ) : (
                            <>
                                <span className="text-4xl mb-2">📅</span>
                                <p>Set semester dates and select a day to preview the schedule.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700">Exam Queue ({examQueue.length})</h3>
                            {examQueue.length > 0 && <button onClick={() => setExamQueue([])} className="text-xs text-red-500 font-bold hover:underline">Clear All</button>}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-6">
                            {examQueue.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <span className="text-4xl mb-2">📥</span>
                                    <p>Add exams to the queue here.</p>
                                </div>
                            ) : (
                                examQueue.map((item, idx) => (
                                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center animate-slide-up">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded text-white font-bold uppercase ${item.type === 'Semester Exam' ? 'bg-red-500' : 'bg-purple-500'}`}>{item.type}</span>
                                                <span className="font-mono font-bold text-slate-700 text-sm">{item.date}</span>
                                            </div>
                                            <div className="font-bold text-slate-800 mt-1">{item.purpose.split(': ')[1]}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {item.labCode} • Periods: {item.periods.join(", ")} • {item.subjectName}
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromQueue(item.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition">✕</button>
                                    </div>
                                ))
                            )}
                        </div>

                        {examQueue.length > 0 && (
                            <button onClick={handleSubmit} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2">
                                <span>🚀 Submit {examQueue.length} Exam Bookings</span>
                            </button>
                        )}
                    </>
                )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}