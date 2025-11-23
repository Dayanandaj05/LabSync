import React, { useState, useEffect } from "react";
import API from "../services/api";
import { approveBooking, rejectBooking } from "../services/admin"; // ✅ Import Admin Actions

export default function BookingModal({ slot, onClose, onSubmit }) {
  const [purposeType, setPurposeType] = useState("Regular"); 
  const [customPurpose, setCustomPurpose] = useState(""); 
  
  // State Fields
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [showInBanner, setShowInBanner] = useState(false);
  const [bannerColor, setBannerColor] = useState("blue");

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (user?.role === 'Staff') {
      API.get('/api/public/subjects').then(res => setSubjects(res.data.subjects || []));
    }
  }, [user]);

  if (!user || !slot) return null;
  const isOverrideMode = !!slot.existingBooking; 
  const isAdmin = user.role === 'Admin';
  const isPending = slot.existingBooking?.status === 'Pending';

  // ✅ ADMIN: Handle Approve
  const handleApprove = async () => {
    try {
      await approveBooking(slot.existingBooking._id, token);
      alert("✅ Booking Approved!");
      window.location.reload(); // Refresh grid
    } catch (err) {
      alert("Failed to approve");
    }
  };

  // ✅ ADMIN: Handle Reject
  const handleReject = async () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await rejectBooking(slot.existingBooking._id, reason, token);
      alert("❌ Booking Rejected.");
      window.location.reload(); // Refresh grid
    } catch (err) {
      alert("Failed to reject");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user.role === 'Staff' && !selectedSubject) return alert("Staff members must select a Subject.");

    const finalPurpose = purposeType === "Other" ? customPurpose : purposeType;
    if (!finalPurpose.trim() && purposeType !== 'Other') return alert("Please enter a purpose");

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

  const handleCancelBooking = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await API.delete(`/api/admin/bookings/${slot.existingBooking._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Booking cancelled.");
      window.location.reload(); 
    } catch (err) {
      alert("Failed to cancel");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-fade-in scale-100 border-t-4 border-slate-900 overflow-y-auto max-h-[90vh]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

        <div className="mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {isOverrideMode ? "Manage Slot" : "Book Lab Slot"}
          </h2>
          <p className="text-sm text-blue-600 font-medium mt-1">
            {slot.labName} • <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-700">Period {slot.period}</span> • {slot.date}
          </p>
        </div>

        {isOverrideMode && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Current Booking</h3>
            <div className="flex justify-between items-start">
               <div>
                 <div className="text-slate-900 font-bold">{slot.existingBooking.creatorName}</div>
                 <div className="text-slate-500 text-xs italic">"{slot.existingBooking.purpose}"</div>
               </div>
               <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                 slot.existingBooking.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
               }`}>
                 {slot.existingBooking.status}
               </span>
            </div>

            {/* ✅ ADMIN ACTIONS PANEL */}
            {isAdmin && (
               <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-2">
                  {/* Approve/Reject only if Pending */}
                  {isPending ? (
                     <>
                        <button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition">
                           ✅ APPROVE
                        </button>
                        <button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition">
                           ❌ REJECT
                        </button>
                     </>
                  ) : (
                     // If Approved, show Cancel
                     <button onClick={handleCancelBooking} className="col-span-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg text-xs font-bold transition">
                        🗑 CANCEL BOOKING
                     </button>
                  )}
               </div>
            )}
            
            {/* Non-Admins only see Cancel if it's their own booking (handled by backend check usually, or we hide it here) */}
            {!isAdmin && (
               <button onClick={handleCancelBooking} className="mt-3 w-full bg-white border border-red-300 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition">
                 CANCEL MY BOOKING
               </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {isOverrideMode && (
             <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest my-4">
                — OR OVERRIDE WITH NEW —
             </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Event Type</label>
            <select required value={purposeType} onChange={(e) => setPurposeType(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="Regular">Regular Class</option>
              <option value="Test">Test / Exam</option>
              <option value="Project Review">Project Review</option>
              <option value="Workshop">Workshop</option>
              <option value="Other">Other (Custom Event)</option>
            </select>
          </div>

          {/* Staff Subject Selection */}
          {user.role === 'Staff' && (
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Subject <span className="text-red-500">*</span></label>
                <select required value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full p-3 border border-purple-300 bg-purple-50 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
                   <option value="">-- Choose Subject --</option>
                   {subjects.map(s => (
                      <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
                   ))}
                </select>
             </div>
          )}

          {/* Details Input */}
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">
                {purposeType === 'Regular' ? 'Class Description' : 'Event / Custom Title'}
             </label>
             <input type="text" required value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)} 
                    placeholder={purposeType === 'Regular' ? 'e.g. Lab Exercise 3' : 'e.g. Hackathon Prep'}
                    className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Banner Options */}
          {purposeType !== 'Regular' && (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={showInBanner} onChange={(e) => setShowInBanner(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                   <span className="text-sm font-bold text-slate-700">📣 Display in Global Banner?</span>
                </label>

                {showInBanner && (
                   <div className="mt-3 animate-fade-in">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Banner Color</label>
                      <div className="flex gap-2">
                         {['pink', 'indigo', 'green', 'orange', 'red'].map(c => (
                            <button key={c} type="button" 
                               onClick={() => setBannerColor(c)}
                               className={`w-6 h-6 rounded-full border-2 transition-all ${bannerColor === c ? 'border-slate-800 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                               style={{backgroundColor: c === 'indigo' ? '#6366f1' : c === 'pink' ? '#ec4899' : c === 'green' ? '#10b981' : c === 'orange' ? '#f97316' : '#ef4444'}}
                            />
                         ))}
                      </div>
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