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
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [showInBanner, setShowInBanner] = useState(false);
  const [bannerColor, setBannerColor] = useState("blue");

  // ✅ LOAD SUBJECTS
  useEffect(() => {
      API.get('/api/public/subjects').then(res => setSubjects(res.data.subjects || []));
  }, []);

  // --- PERMISSIONS LOGIC ---
  const isOccupied = !!slot.existingBooking;
  const isAdmin = user.role === 'Admin';
  const isStaff = user.role === 'Staff';
  
  const isMine = isOccupied && slot.existingBooking.creatorName === user.name;
  
  // ✅ LOGIC UPDATE: Who can override?
  // Admin: Can override ANYONE.
  // Staff: Can override STUDENTS (but not other Staff/Admins).
  const canOverride = isAdmin || (isStaff && slot.existingBooking.role === 'Student');

  // ✅ Explicit View Modes
  const viewMode = {
    // 1. Management View (Approve/Reject/Force Cancel) - Admin Only
    ADMIN_MANAGE: isOccupied && isAdmin,

    // 2. Owner View (Cancel my own booking)
    OWNER: isOccupied && isMine && !isAdmin, 

    // 3. Override View (Booking form appears OVER occupied info)
    // Show this if I have permission to kick them out
    OVERRIDE: isOccupied && !isMine && canOverride,

    // 4. Waitlist View (I cannot override, so I must wait)
    WAITLIST: isOccupied && !isMine && !canOverride,

    // 5. Standard Booking (Slot is free)
    BOOKING: !isOccupied
  };

  // --- FORM LOGIC ---
  const getTypes = () => {
    if (isAdmin) return ['Regular', 'Test', 'Exam', 'Project Review', 'Workshop', 'Placement Preparation', 'Studies', 'Lab Practice', 'Progression', 'Event', 'Other'];
    if (isStaff) return ['Regular', 'Test', 'Exam', 'Project Review', 'Workshop', 'Event', 'Other'];
    return ['Placement Preparation', 'Studies', 'Lab Practice', 'Progression', 'Regular', 'Other'];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isStaff && !selectedSubject) return alert("Staff members must select a Subject.");
    if (isAdmin && ['Test', 'Exam'].includes(purposeType) && !selectedSubject) return alert("Tests/Exams require a Subject.");

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

  // --- ACTIONS ---
  const handleApprove = async () => { try { await approveBooking(slot.existingBooking._id, token); alert("✅ Approved!"); window.location.reload(); } catch (err) { alert("Failed"); } };
  const handleReject = async () => { const r = prompt("Reason:"); if(!r) return; try { await rejectBooking(slot.existingBooking._id, r, token); alert("❌ Rejected."); window.location.reload(); } catch (err) { alert("Failed"); } };
  const handleCancelBooking = async () => { if (!confirm("Cancel this booking?")) return; try { await API.delete(`/api/admin/bookings/${slot.existingBooking._id}`, { headers: { Authorization: `Bearer ${token}` } }); alert("Cancelled."); window.location.reload(); } catch (err) { alert("Failed"); } };

  const handleJoinWaitlist = async () => {
     try {
        await API.post(`/api/bookings/${slot.existingBooking._id}/waitlist`, {}, { headers: { Authorization: `Bearer ${token}` }});
        alert("✅ Added to waitlist! You will be notified if this slot opens.");
        onClose();
     } catch (err) {
        alert(err.response?.data?.error || "Failed to join waitlist");
     }
  };

  const canShowBanner = !['Regular', 'Test', 'Exam', 'Studies', 'Lab Practice', 'Progression'].includes(purposeType);
  const showSubjectDropdown = (isStaff) || (isAdmin) || (user.role === 'Student' && purposeType === 'Regular');
  const isSubjectRequired = (isStaff) || (isAdmin && ['Test', 'Exam'].includes(purposeType));
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
          <h2 className="text-2xl font-bold text-slate-800">{isOccupied ? "Slot Details" : "Book Lab Slot"}</h2>
          <p className="text-sm text-blue-600 font-medium mt-1">{slot.labName} • Period {slot.period} • {slot.date}</p>
        </div>

        {/* =========================================
            VIEW 1: WAITLIST ONLY
            (Student viewing occupied, OR Staff viewing Admin/Staff occupied)
           ========================================= */}
        {viewMode.WAITLIST && (
           <div className="space-y-4">
               <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-center">
                   <div className="text-4xl mb-2">🔒</div>
                   <h3 className="text-yellow-800 font-bold">Slot Booked</h3>
                   <p className="text-sm text-yellow-700 mt-1">
                      Occupied by <span className="font-bold">{slot.existingBooking.creatorName}</span>
                   </p>
                   <p className="text-xs text-yellow-600 mt-1 italic">"{slot.existingBooking.purpose}"</p>
               </div>
               
               <button onClick={handleJoinWaitlist} className="w-full bg-slate-800 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
                  🔔 Join Waitlist
               </button>
               <p className="text-[10px] text-center text-slate-400">You will be notified via email if this booking is cancelled.</p>
           </div>
        )}

        {/* =========================================
            VIEW 2: OWNER (My Booking)
           ========================================= */}
        {viewMode.OWNER && (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center space-y-4">
             <div className="text-4xl">👤</div>
             <div>
                <h3 className="text-blue-900 font-bold text-lg">Your Booking</h3>
                <p className="text-blue-700 text-sm mt-1">{slot.existingBooking.purpose}</p>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 uppercase ${slot.existingBooking.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {slot.existingBooking.status}
                </div>
             </div>
             <button onClick={handleCancelBooking} className="w-full bg-white border-2 border-red-100 text-red-600 py-2 rounded-lg font-bold hover:bg-red-50 hover:border-red-200 transition">
                🗑 Cancel My Booking
             </button>
          </div>
        )}

        {/* =========================================
            VIEW 3: ADMIN MANAGE (Approve/Reject + WAITLIST VISIBILITY)
           ========================================= */}
        {viewMode.ADMIN_MANAGE && (
          <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-slate-900 font-bold">{slot.existingBooking.creatorName}</div>
                    <div className="text-slate-500 text-xs italic">"{slot.existingBooking.purpose}"</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${slot.existingBooking.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{slot.existingBooking.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                    {slot.existingBooking.status === 'Pending' ? (
                      <>
                        <button onClick={handleApprove} className="bg-emerald-600 text-white py-2 rounded font-bold text-xs">✅ APPROVE</button>
                        <button onClick={handleReject} className="bg-red-600 text-white py-2 rounded font-bold text-xs">❌ REJECT</button>
                      </>
                    ) : (
                      <button onClick={handleCancelBooking} className="col-span-2 bg-white border border-red-200 text-red-600 py-2 rounded font-bold text-xs">🗑 FORCE CANCEL</button>
                    )}
                </div>
              </div>

              {/* ✅ NEW: WAITLIST DISPLAY FOR ADMIN */}
              {slot.existingBooking.waitlist && slot.existingBooking.waitlist.length > 0 && (
                 <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl animate-fade-in">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest mb-2 flex justify-between">
                       <span>⏳ Waitlist Queue</span>
                       <span className="bg-indigo-200 text-indigo-800 px-1.5 rounded-full">{slot.existingBooking.waitlist.length}</span>
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                       {slot.existingBooking.waitlist.map((w, index) => (
                          <div key={index} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-indigo-100 shadow-sm">
                             <div>
                                <span className="font-bold text-slate-700">{w.user?.name || "Unknown User"}</span>
                                <span className="text-slate-400 ml-1">({w.user?.classGroup || "N/A"})</span>
                             </div>
                             <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(w.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                          </div>
                       ))}
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-2 text-center italic">
                       Cancelling the booking above will verify waitlisted users via email.
                    </p>
                 </div>
              )}
          </div>
        )}

        {/* =========================================
            VIEW 4: BOOKING FORM 
            (Standard Booking OR Staff/Admin Override)
           ========================================= */}
        {(viewMode.BOOKING || viewMode.OVERRIDE || viewMode.ADMIN_MANAGE) && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* If Overriding, show a divider */}
              {(viewMode.OVERRIDE || viewMode.ADMIN_MANAGE) && (
                 <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-300"></span></div>
                    <div className="relative flex justify-center"><span className="bg-white px-2 text-xs font-bold text-slate-400 uppercase tracking-widest">OR OVERRIDE WITH NEW</span></div>
                 </div>
              )}
              
              {/* If Overriding, show option to Waitlist instead */}
              {viewMode.OVERRIDE && (
                  <button type="button" onClick={handleJoinWaitlist} className="w-full border border-slate-300 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 mb-2">
                      Queue in Waitlist Instead
                  </button>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Booking Type</label>
                <select required value={purposeType} onChange={(e) => { setPurposeType(e.target.value); setCustomPurpose(""); }} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {getTypes().map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {purposeType === 'Placement Preparation' && (
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fade-in">
                    <label className="block text-xs font-bold text-blue-700 mb-2">Activity Type</label>
                    <select value={placementActivity} onChange={(e) => setPlacementActivity(e.target.value)} className="w-full p-2 border border-blue-200 rounded-lg mb-3 outline-none bg-white">
                      <option>Topic Focus</option><option>Study Session</option><option>Discussion</option><option>Practice</option><option>Other</option>
                    </select>
                    <input type="text" placeholder={placementActivity === 'Topic Focus' ? "e.g. Dynamic Programming" : "Details"} required={isDetailRequired()} value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)} className="w-full p-2 border border-blue-200 rounded-lg outline-none" />
                 </div>
              )}

              {showSubjectDropdown && (
                 <div className="animate-fade-in">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Subject {isSubjectRequired && <span className="text-red-500">*</span>}</label>
                    <select required={isSubjectRequired} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className={`w-full p-3 border rounded-xl outline-none focus:ring-2 ${isSubjectRequired ? 'border-purple-300 bg-purple-50 focus:ring-purple-500' : 'border-slate-300 bg-white focus:ring-blue-500'}`}>
                       <option value="">-- Choose Subject --</option>
                       {subjects.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
                    </select>
                 </div>
              )}

              {purposeType !== 'Placement Preparation' && (
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Details / Topic</label>
                    <input type="text" required={isDetailRequired()} value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)} placeholder={getPlaceholder()} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
              )}

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
                <button type="submit" className={`px-6 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all ${isOccupied ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                  {isOccupied ? "Override Booking" : "Confirm Booking"}
                </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
}