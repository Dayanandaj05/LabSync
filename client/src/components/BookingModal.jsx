import React, { useState, useEffect } from "react";
import API from "../services/api";
import { approveBooking, rejectBooking } from "../services/admin";

export default function BookingModal({ slot, onClose, onSubmit }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  // --- FORM STATE ---
  const [purposeType, setPurposeType] = useState("Placement Preparation");
  const [placementActivity, setPlacementActivity] = useState("Topic Focus");
  const [customPurpose, setCustomPurpose] = useState(""); 
  
  // Fields
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [showInBanner, setShowInBanner] = useState(false);
  const [bannerColor, setBannerColor] = useState("blue");

  // --- DERIVED STATE ---
  const isOverrideMode = !!slot.existingBooking;
  const isAdmin = user.role === 'Admin';
  const isPending = slot.existingBooking?.status === 'Pending';

  // ✅ LOAD SUBJECTS FOR EVERYONE (Students need it for Regular now)
  useEffect(() => {
      API.get('/api/public/subjects').then(res => setSubjects(res.data.subjects || []));
  }, []);

  // --- LOGIC: AVAILABLE TYPES ---
  const getTypes = () => {
    if (isAdmin) {
      return ['Regular', 'Test', 'Exam', 'Project Review', 'Workshop', 'Placement Preparation', 'Studies', 'Lab Practice', 'Progression', 'Event', 'Other'];
    }
    if (user.role === 'Staff') {
      return ['Regular', 'Test', 'Exam', 'Project Review', 'Workshop', 'Event', 'Other'];
    }
    return ['Placement Preparation', 'Studies', 'Lab Practice', 'Progression', 'Regular', 'Other'];
  };

  // --- LOGIC: SUBMIT ---
  const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Validation: Subject (Staff MUST have it, Admin MUST have it for Test)
    if (user.role === 'Staff' && !selectedSubject) return alert("Staff members must select a Subject.");
    if (isAdmin && ['Test', 'Exam'].includes(purposeType) && !selectedSubject) return alert("Tests/Exams require a Subject.");

    // 2. Construct Purpose String
    let finalPurpose = "";

    if (purposeType === "Placement Preparation") {
      finalPurpose = `Placement: ${placementActivity}`;
      if (customPurpose.trim()) finalPurpose += ` - ${customPurpose}`;
    } else {
      finalPurpose = customPurpose.trim() || purposeType;
    }

    if (!finalPurpose.trim()) return alert("Please enter a description/purpose.");

    onSubmit({
      labCode: slot.labCode,
      date: slot.date,
      period: slot.period,
      purpose: finalPurpose,
      type: purposeType,
      subjectId: selectedSubject || null,
      showInBanner, 
      bannerColor
    });
  };

  // --- ADMIN ACTIONS ---
  const handleApprove = async () => {
    try { await approveBooking(slot.existingBooking._id, token); alert("✅ Approved!"); window.location.reload(); } catch (err) { alert("Failed"); }
  };
  const handleReject = async () => {
    const r = prompt("Reason:"); if(!r) return;
    try { await rejectBooking(slot.existingBooking._id, r, token); alert("❌ Rejected."); window.location.reload(); } catch (err) { alert("Failed"); }
  };
  const handleCancelBooking = async () => {
    if (!confirm("Cancel this booking?")) return;
    try { await API.delete(`/api/admin/bookings/${slot.existingBooking._id}`, { headers: { Authorization: `Bearer ${token}` } }); alert("Cancelled."); window.location.reload(); } catch (err) { alert("Failed"); }
  };

  // --- VIEW LOGIC ---
  const canShowBanner = !['Regular', 'Test', 'Exam', 'Studies', 'Lab Practice', 'Progression'].includes(purposeType);

  // Helper: When to show Subject Dropdown?
  // 1. Staff: Always
  // 2. Admin: Always (Optional for non-tests)
  // 3. Student: Only for Regular (Optional)
  const showSubjectDropdown = 
      (user.role === 'Staff') || 
      (isAdmin) || 
      (user.role === 'Student' && purposeType === 'Regular');

  // Helper: Is Subject Required?
  const isSubjectRequired = 
      (user.role === 'Staff') || 
      (isAdmin && ['Test', 'Exam'].includes(purposeType));

  // Helper: Input Requirement for Details
  const isDetailRequired = () => {
    if (purposeType === 'Placement Preparation') return ['Topic Focus', 'Other'].includes(placementActivity);
    if (['Studies', 'Lab Practice', 'Progression'].includes(purposeType)) return false;
    return true; 
  };

  const getPlaceholder = () => {
    if (purposeType === 'Studies') return 'e.g. Mathematics, DSA (Optional)';
    if (purposeType === 'Lab Practice') return 'e.g. React Project (Optional)';
    if (purposeType === 'Progression') return 'e.g. Portfolio building (Optional)';
    if (purposeType === 'Regular') return 'e.g. Lab Exercise 4';
    return 'Event Title / Details';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in border-t-4 border-slate-900 overflow-y-auto max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

        <div className="mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">{isOverrideMode ? "Manage Slot" : "Book Lab Slot"}</h2>
          <p className="text-sm text-blue-600 font-medium mt-1">{slot.labName} • Period {slot.period} • {slot.date}</p>
        </div>

        {/* --- OVERRIDE / MANAGE MODE --- */}
        {isOverrideMode && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-start mb-2">
               <div>
                 <div className="text-slate-900 font-bold">{slot.existingBooking.creatorName}</div>
                 <div className="text-slate-500 text-xs italic">"{slot.existingBooking.purpose}"</div>
               </div>
               <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${slot.existingBooking.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{slot.existingBooking.status}</span>
            </div>
            {isAdmin ? (
               <div className="grid grid-cols-2 gap-2 mt-4">
                 {isPending ? (
                   <>
                     <button onClick={handleApprove} className="bg-emerald-600 text-white py-2 rounded font-bold text-xs">✅ APPROVE</button>
                     <button onClick={handleReject} className="bg-red-600 text-white py-2 rounded font-bold text-xs">❌ REJECT</button>
                   </>
                 ) : (
                   <button onClick={handleCancelBooking} className="col-span-2 bg-white border border-red-200 text-red-600 py-2 rounded font-bold text-xs">🗑 CANCEL BOOKING</button>
                 )}
               </div>
            ) : (
               <button onClick={handleCancelBooking} className="w-full bg-white border border-red-200 text-red-600 py-2 rounded font-bold text-xs mt-2">CANCEL MY BOOKING</button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isOverrideMode && <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest my-4">— OR OVERRIDE WITH NEW —</div>}

          {/* 1. TYPE SELECTOR */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Booking Type</label>
            <select required value={purposeType} onChange={(e) => { setPurposeType(e.target.value); setCustomPurpose(""); }} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              {getTypes().map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* 2. PLACEMENT SUB-OPTIONS */}
          {purposeType === 'Placement Preparation' && (
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fade-in">
                <label className="block text-xs font-bold text-blue-700 mb-2">Activity Type</label>
                <select value={placementActivity} onChange={(e) => setPlacementActivity(e.target.value)} className="w-full p-2 border border-blue-200 rounded-lg mb-3 outline-none bg-white">
                  <option>Topic Focus</option>
                  <option>Study Session</option>
                  <option>Discussion</option>
                  <option>Practice</option>
                  <option>Other</option>
                </select>
                <label className="block text-xs font-bold text-blue-500 mb-1">
                    {placementActivity === 'Topic Focus' ? 'Which Topic? (Required)' : 'Additional Details (Optional)'}
                </label>
                <input 
                    type="text" 
                    placeholder={placementActivity === 'Topic Focus' ? "e.g. Dynamic Programming" : "e.g. Group of 4"} 
                    required={isDetailRequired()} 
                    value={customPurpose} 
                    onChange={(e) => setCustomPurpose(e.target.value)} 
                    className="w-full p-2 border border-blue-200 rounded-lg outline-none" 
                />
             </div>
          )}

          {/* 3. SUBJECT SELECTION (Modified Logic) */}
          {showSubjectDropdown && (
             <div className="animate-fade-in">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                   Select Subject 
                   {isSubjectRequired ? <span className="text-red-500 ml-1">*</span> : <span className="text-slate-400 text-xs font-normal ml-2">(Optional)</span>}
                </label>
                <select 
                    required={isSubjectRequired} 
                    value={selectedSubject} 
                    onChange={(e) => setSelectedSubject(e.target.value)} 
                    className={`w-full p-3 border rounded-xl outline-none focus:ring-2 ${isSubjectRequired ? 'border-purple-300 bg-purple-50 focus:ring-purple-500' : 'border-slate-300 bg-white focus:ring-blue-500'}`}
                >
                   <option value="">-- Choose Subject --</option>
                   {subjects.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
                </select>
             </div>
          )}

          {/* 4. GENERIC DESCRIPTION */}
          {purposeType !== 'Placement Preparation' && (
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Details / Topic</label>
                <input type="text" 
                       required={isDetailRequired()} 
                       value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)} 
                       placeholder={getPlaceholder()} 
                       className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
          )}

          {/* 5. BANNER OPTIONS */}
          {canShowBanner && (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in">
                <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={showInBanner} onChange={(e) => setShowInBanner(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                   <span className="text-sm font-bold text-slate-700">📣 Display in Global Banner?</span>
                </label>
                {showInBanner && (
                   <div className="mt-3 flex gap-2">
                      {['pink', 'indigo', 'green', 'orange', 'red'].map(c => (
                         <button key={c} type="button" onClick={() => setBannerColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${bannerColor === c ? 'border-slate-800 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{backgroundColor: c==='indigo'?'#6366f1':c==='pink'?'#ec4899':c==='green'?'#10b981':c==='orange'?'#f97316':'#ef4444'}} />
                      ))}
                   </div>
                )}
             </div>
          )}

          <div className="flex justify-end gap-3 mt-8 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">Close</button>
            <button type="submit" className={`px-6 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all ${isOverrideMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
              {isOverrideMode ? "Override Booking" : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}