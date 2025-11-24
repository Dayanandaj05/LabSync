import React, { useEffect, useState } from "react";
import API from "../services/api";
import { BarChart } from "../components/AdminCharts";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  // Data State
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]); // ✅ NEW
  
  // Users & Search
  const [usersList, setUsersList] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  
  // Subjects
  const [subjects, setSubjects] = useState([]);
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");

  const [stats, setStats] = useState(null);
  const [token] = useState(localStorage.getItem("token") || "");
  const [activeTab, setActiveTab] = useState("pending"); 
  
  // Tools State
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementType, setAnnouncementType] = useState("Info");
  const [announcementDuration, setAnnouncementDuration] = useState(7); 
  const [mLab, setMLab] = useState("CC");
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mReason, setMReason] = useState("");

  const fetchData = async () => {
    if (!token) return;
    try {
      const bookingsRes = await API.get("/api/admin/bookings/pending", { headers: { Authorization: `Bearer ${token}` } });
      const usersRes = await API.get("/api/admin/users/pending", { headers: { Authorization: `Bearer ${token}` } });
      const statsRes = await API.get("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });

      setPendingBookings(bookingsRes.data.pending || []);
      setPendingUsers(usersRes.data.pending || []);
      setStats(statsRes.data);

      if (activeTab === 'history') {
        const historyRes = await API.get("/api/admin/bookings/history", { headers: { Authorization: `Bearer ${token}` } });
        setBookingHistory(historyRes.data.history || []);
      }
      if (activeTab === 'users') {
        const listRes = await API.get("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
        setUsersList(listRes.data.users || []);
      }
      if (activeTab === 'subjects') {
        const subRes = await API.get("/api/admin/subjects", { headers: { Authorization: `Bearer ${token}` } });
        setSubjects(subRes.data.subjects || []);
      }
      // ✅ NEW: Fetch Announcements
      if (activeTab === 'announcements') {
        const annRes = await API.get("/api/admin/announcements", { headers: { Authorization: `Bearer ${token}` } });
        setAnnouncementsList(annRes.data.announcements || []);
      }

    } catch (err) { console.error("Fetch Error:", err); }
  };

  useEffect(() => { fetchData(); }, [token, activeTab]);

  // --- ACTIONS ---
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;
    try {
      await API.post('/api/admin/announcements', { 
        message: announcementMsg, type: announcementType, daysActive: Number(announcementDuration) 
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Announcement Posted!");
      setAnnouncementMsg("");
      fetchData();
    } catch (err) { alert("Failed to post"); }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    try {
        await API.delete(`/api/admin/announcements/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleToggleAnnouncement = async (id, currentStatus) => {
    try {
        await API.put(`/api/admin/announcements/${id}`, { active: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
        fetchData();
    } catch (err) { alert("Failed to update"); }
  };

  const handleExtendAnnouncement = async (id) => {
    try {
        await API.put(`/api/admin/announcements/${id}`, { extendDays: 7 }, { headers: { Authorization: `Bearer ${token}` } });
        alert("Extended by 7 days.");
        fetchData();
    } catch (err) { alert("Failed to extend"); }
  };

  const handleMaintenance = async (e) => {
    e.preventDefault();
    if (!confirm(`Are you sure? This will CANCEL ALL bookings in ${mLab} from ${mStart} to ${mEnd}.`)) return;
    try {
      await API.post('/api/admin/labs/maintenance', {
        labCode: mLab, startDate: mStart, endDate: mEnd, reason: mReason
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Maintenance Enabled");
      setMReason(""); setMStart(""); setMEnd("");
    } catch (err) { alert("Failed: " + (err.response?.data?.error || err.message)); }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubCode || !newSubName) return;
    try {
      await API.post('/api/admin/subjects', { code: newSubCode, name: newSubName }, { headers: { Authorization: `Bearer ${token}` } });
      setNewSubCode(""); setNewSubName("");
      fetchData();
    } catch (err) { alert("Failed to add subject"); }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm("Delete this subject?")) return;
    try {
      await API.delete(`/api/admin/subjects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleResetSemester = async () => {
    if (!confirm("⚠ WARNING: This will DELETE ALL SUBJECTS to start a new semester cycle. Are you sure?")) return;
    try {
      await API.post('/api/admin/reset-semester', {}, { headers: { Authorization: `Bearer ${token}` } });
      alert("Semester Reset. Subjects cleared.");
      fetchData();
    } catch (err) { alert("Reset failed"); }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    try {
      const res = await API.get(`/api/admin/users/${user._id}/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      setUserBookings(res.data.bookings || []);
    } catch (err) { alert("Failed to fetch user bookings"); }
  };

  const handleAction = async (endpoint, id, action) => {
    try {
      const url = `/api/admin/${endpoint}/${id}/${action}`;
      const payload = action === 'reject' ? { reason: prompt("Reason:") } : {};
      if (action === 'reject' && !payload.reason) return;
      await API.put(url, payload, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert("Failed"); }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm("Cancel this booking? Waitlisted users will be notified.")) return;
    try {
      await API.delete(`/api/admin/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
      // ✅ FIX: Reload the correct tab data
      if (activeTab === 'history') {
         const historyRes = await API.get("/api/admin/bookings/history", { headers: { Authorization: `Bearer ${token}` } });
         setBookingHistory(historyRes.data.history || []);
      } else if (selectedUser) {
         handleViewUser(selectedUser);
      } else {
         fetchData();
      }
    } catch (err) { alert("Failed"); }
  };

  const formatDate = (d) => !d ? "N/A" : new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const labChartData = stats ? stats.bookingsByLab.map(l => ({ label: l._id, value: l.count })) : [];
  const roleChartData = stats ? stats.bookingsByRole.map(r => ({ label: r._id, value: r.count })) : [];
  const subjectChartData = stats && stats.bookingsBySubject ? stats.bookingsBySubject.map(s => ({ label: s._id, value: s.count })) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50 font-sans text-slate-800">
      
      {/* 1. COMPACT TOOLBAR (Stats & Actions) */}
      <div className="bg-white border-b px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-sm z-20">
         
         {/* Stats Pills */}
         {stats && (
           <div className="flex gap-3 text-xs font-bold">
             <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 shadow-sm flex items-center gap-2">👥 Users: {stats.totalUsers}</div>
             <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200 shadow-sm flex items-center gap-2">📅 Bookings: {stats.totalBookings}</div>
           </div>
         )}

         {/* Quick Actions */}
         <div className="flex items-center gap-4 text-xs overflow-x-auto no-scrollbar">
            
            {/* Maintenance Form */}
            <form onSubmit={handleMaintenance} className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
               <select className="px-1 py-1 bg-transparent font-bold text-red-900 outline-none" value={mLab} onChange={e=>setMLab(e.target.value)}><option>CC</option><option>IS</option><option>CAT</option></select>
               <input type="date" className="px-1 py-1 bg-transparent w-24 outline-none" value={mStart} onChange={e=>setMStart(e.target.value)} required />
               <span className="text-red-300">-</span>
               <input type="date" className="px-1 py-1 bg-transparent w-24 outline-none" value={mEnd} onChange={e=>setMEnd(e.target.value)} required />
               <button type="submit" className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Block</button>
            </form>

            <div className="w-px h-6 bg-slate-200"></div>
            
            <Link to="/recurring" className="bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-black transition whitespace-nowrap">🔄 Recurrence</Link>
            
            <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/admin/export-csv?token=${token}`} target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition font-bold whitespace-nowrap">⬇ CSV</a>
         </div>
      </div>

      {/* 2. MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <nav className="w-48 bg-white border-r flex flex-col pt-4 shrink-0 overflow-y-auto">
          <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Dashboard</div>
          {['Pending', 'History', 'Announcements', 'Users', 'Subjects', 'Analytics'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} 
               className={`text-left px-6 py-3 font-bold text-sm border-l-4 transition-all ${activeTab === tab.toLowerCase() ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
               {tab}
               {tab === 'Pending' && (pendingBookings.length + pendingUsers.length > 0) && (<span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingBookings.length + pendingUsers.length}</span>)}
             </button>
          ))}
        </nav>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* TAB: PENDING */}
          {activeTab === 'pending' && (
            <div className="flex flex-col md:flex-row gap-6 h-full">
              {/* Users Column */}
              <div className="flex-1 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden max-h-full">
                <div className="p-4 border-b bg-slate-50 font-bold text-sm text-slate-700 flex justify-between"><span>New Users</span><span className="bg-slate-200 px-2 rounded-full text-xs">{pendingUsers.length}</span></div>
                <div className="overflow-y-auto p-2 space-y-2 flex-1 custom-scrollbar">
                  {pendingUsers.map(u => (
                    <div key={u._id} className="flex justify-between items-center bg-white p-3 rounded-lg border hover:shadow-sm transition">
                      <div><p className="font-bold text-sm">{u.name}</p><p className="text-[10px] text-slate-500">{u.email} ({u.classGroup})</p></div>
                      <div className="flex gap-1"><button onClick={() => handleAction('users', u._id, 'approve')} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">✓</button><button onClick={() => handleAction('users', u._id, 'reject')} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">✕</button></div>
                    </div>
                  ))}
                  {pendingUsers.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">All users approved.</div>}
                </div>
              </div>
              {/* Bookings Column */}
              <div className="flex-[1.5] bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden max-h-full">
                <div className="p-4 border-b bg-slate-50 font-bold text-sm text-slate-700 flex justify-between"><span>Booking Requests</span><span className="bg-slate-200 px-2 rounded-full text-xs">{pendingBookings.length}</span></div>
                <div className="overflow-y-auto p-2 space-y-2 flex-1 custom-scrollbar">
                  {pendingBookings.map(b => (
                    <div key={b._id} className="p-3 bg-white rounded-lg border hover:shadow-md transition relative group">
                      <div className="flex justify-between mb-1"><span className="font-bold text-sm text-indigo-900">{b.creatorName}</span><span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">{b.role}</span></div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-2"><span className="font-mono font-bold bg-slate-100 px-1 rounded">{b.labCode}</span><span>{b.date}</span><span className="font-bold text-slate-400">P{b.period}</span></div>
                      <div className="text-xs italic text-slate-500 mb-2 border-l-2 border-slate-200 pl-2">"{b.purpose}"</div>
                      <div className="flex gap-2"><button onClick={() => handleAction('bookings', b._id, 'approve')} className="flex-1 bg-emerald-600 text-white py-1.5 rounded text-xs font-bold hover:bg-emerald-700">Approve</button><button onClick={() => handleAction('bookings', b._id, 'reject')} className="flex-1 bg-white border border-red-200 text-red-600 py-1.5 rounded text-xs font-bold hover:bg-red-50">Reject</button></div>
                    </div>
                  ))}
                  {pendingBookings.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">No pending bookings.</div>}
                </div>
              </div>
            </div>
          )}

          {/* TAB: HISTORY */}
{activeTab === 'history' && (
  <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-full">
    <div className="overflow-auto custom-scrollbar">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
           <tr>
             <th className="p-3">Date</th>
             <th className="p-3">User</th>
             <th className="p-3">Details</th>
             <th className="p-3 text-center">Waitlist</th> {/* ✅ NEW COL */}
             <th className="p-3">Status</th>
             <th className="p-3">Action</th>
           </tr>
        </thead>
        <tbody className="divide-y">
          {bookingHistory.map(b => (
            <tr key={b._id} className="hover:bg-slate-50">
              <td className="p-3 text-xs font-mono text-slate-500">{formatDate(b.updatedAt || b.createdAt)}</td>
              <td className="p-3 font-bold">{b.creatorName}</td>
              <td className="p-3">Lab {b.labCode}, P{b.period} <br/><span className="text-xs text-slate-400">{b.date}</span></td>

              {/* ✅ NEW WAITLIST CELL */}
              <td className="p-3 text-center">
                 {b.waitlist && b.waitlist.length > 0 ? (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold shadow-sm">
                       ⏳ {b.waitlist.length}
                    </span>
                 ) : (
                    <span className="text-slate-300">-</span>
                 )}
              </td>

              <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status==='Approved'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{b.status}</span></td>
              <td className="p-3"><button onClick={() => handleCancelBooking(b._id)} className="text-red-500 underline text-xs font-bold hover:text-red-700">Cancel</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

          {/* ✅ TAB: ANNOUNCEMENTS (New Control Panel) */}
          {activeTab === 'announcements' && (
             <div className="flex flex-col h-full gap-6">
                {/* Creation Form */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                   <h3 className="font-bold text-lg mb-4">📢 Post Announcement</h3>
                   <form onSubmit={handlePostAnnouncement} className="flex flex-col md:flex-row gap-3 items-stretch">
                      
                      {/* Message Input */}
                      <input 
                        className="flex-[2] p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="Type your announcement here..." 
                        value={announcementMsg} 
                        onChange={e=>setAnnouncementMsg(e.target.value)} 
                      />
                      
                      {/* Type Selector */}
                      <select 
                        className="p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700" 
                        value={announcementType} 
                        onChange={e=>setAnnouncementType(e.target.value)}
                      >
                         <option value="Info">ℹ️ Info (Blue)</option>
                         <option value="Warning">⚠️ Warning (Red)</option>
                         <option value="Test">🔧 Test (Gray)</option>
                      </select>

                      {/* ✅ DYNAMIC DURATION INPUT */}
                      <div className="flex items-center border rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                        <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Duration:</span>
                        <input 
                            type="number" 
                            min="1" 
                            max="365"
                            className="w-12 outline-none font-bold text-slate-700 text-center" 
                            value={announcementDuration} 
                            onChange={e=>setAnnouncementDuration(e.target.value)} 
                        />
                        <span className="text-xs font-bold text-slate-400 ml-1">Days</span>
                      </div>

                      {/* Submit Button */}
                      <button type="submit" className="bg-slate-900 text-white px-6 rounded-lg font-bold hover:bg-black transition shadow-lg whitespace-nowrap">
                        Post
                      </button>
                   </form>
                </div>
                {/* Management List */}
                <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                   <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">Active & Past Announcements</div>
                   <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                      {announcementsList.map(a => (
                         <div key={a._id} className={`flex justify-between items-center p-4 mb-2 rounded-lg border ${a.active ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200 opacity-70'}`}>
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${a.type==='Warning'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{a.type}</span>
                                  {a.active ? <span className="text-[10px] bg-green-100 text-green-700 px-2 rounded font-bold">ACTIVE</span> : <span className="text-[10px] bg-gray-200 text-gray-500 px-2 rounded font-bold">INACTIVE</span>}
                               </div>
                               <p className="font-medium text-slate-800">{a.message}</p>
                               <p className="text-xs text-slate-400 mt-1">Expires: {new Date(a.expiresAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <button onClick={() => handleExtendAnnouncement(a._id)} className="px-3 py-1.5 text-xs font-bold border rounded hover:bg-slate-50" title="Extend 7 days">+7 Days</button>
                               <button onClick={() => handleToggleAnnouncement(a._id, a.active)} className="px-3 py-1.5 text-xs font-bold border rounded hover:bg-slate-50">{a.active ? "Hide" : "Show"}</button>
                               <button onClick={() => handleDeleteAnnouncement(a._id)} className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100">Delete</button>
                            </div>
                         </div>
                      ))}
                      {announcementsList.length === 0 && <div className="p-10 text-center text-slate-400 italic">No announcements found.</div>}
                   </div>
                </div>
             </div>
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div className="flex gap-6 h-full">
              <div className="w-1/3 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-slate-50"><input type="text" placeholder="🔍 Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" /></div>
                <div className="overflow-y-auto flex-1 p-1 space-y-1 custom-scrollbar">
                  {filteredUsers.map(u => (
                    <div key={u._id} onClick={() => handleViewUser(u)} className={`p-3 rounded-lg cursor-pointer transition-all ${selectedUser?._id === u._id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-700'}`}>
                      <div className="font-bold text-sm">{u.name}</div>
                      <div className={`text-[10px] mt-0.5 uppercase tracking-wider font-bold ${selectedUser?._id === u._id ? 'text-indigo-200' : 'text-slate-400'}`}>{u.role} {u.classGroup !== 'N/A' && `• ${u.classGroup}`}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl border shadow-sm p-6 overflow-y-auto custom-scrollbar">
                {!selectedUser ? <div className="h-full flex flex-col items-center justify-center text-slate-300"><span className="text-4xl mb-2">👤</span>Select a user to view history</div> : (
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedUser.name}</h2>
                    <div className="flex gap-2 mb-6"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{selectedUser.email}</span></div>
                    <h3 className="font-bold text-xs uppercase text-slate-400 mb-3 tracking-widest">Booking History</h3>
                    <div className="space-y-2">
                      {userBookings.map(b => (
                        <div key={b._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border hover:border-slate-300 transition">
                          <div className="flex items-center gap-3">
                             <div className="bg-white px-2 py-1 rounded border font-mono text-xs font-bold">{b.lab?.code}</div>
                             <div className="text-sm"><span className="font-bold text-slate-700">{b.date}</span> <span className="text-slate-400 mx-1">|</span> Period {b.period} <div className="text-xs text-slate-500 italic">"{b.purpose}"</div></div>
                          </div>
                          <div className="flex items-center gap-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.status==='Approved'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{b.status}</span><button onClick={() => handleCancelBooking(b._id)} className="text-red-400 hover:text-red-600 font-bold text-lg">×</button></div>
                        </div>
                      ))}
                      {userBookings.length === 0 && <p className="text-slate-400 italic text-sm">No bookings found.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SUBJECTS */}
          {activeTab === 'subjects' && (
             <div className="h-full bg-white rounded-xl border shadow-sm p-6 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Subject Management</h2><button onClick={handleResetSemester} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold hover:bg-red-100">⚠ Reset Semester</button></div>
                <form onSubmit={handleAddSubject} className="flex gap-2 mb-6">
                  <input placeholder="Code" value={newSubCode} onChange={e=>setNewSubCode(e.target.value)} className="border p-2 rounded w-24 text-sm font-bold uppercase" />
                  <input placeholder="Name" value={newSubName} onChange={e=>setNewSubName(e.target.value)} className="border p-2 rounded flex-1 text-sm" />
                  <button className="bg-slate-900 text-white px-4 rounded text-sm font-bold">Add</button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjects.map(s => (
                      <div key={s._id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                        <div><div className="font-bold text-indigo-700">{s.code}</div><div className="text-xs text-slate-500">{s.name}</div></div>
                        <button onClick={() => handleDeleteSubject(s._id)} className="text-slate-300 hover:text-red-500 font-bold">×</button>
                      </div>
                  ))}
                </div>
             </div>
          )}

          {/* TAB: ANALYTICS */}
          {activeTab === 'analytics' && stats && (
             <div className="h-full overflow-y-auto custom-scrollbar p-2">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64 mb-6">
                  <BarChart title="Lab Usage" data={labChartData} color="green" />
                  <BarChart title="Role Activity" data={roleChartData} color="orange" />
               </div>
               <div className="h-80 mb-6">
                  <BarChart title="Classes Held per Subject" data={subjectChartData} color="purple" />
               </div>
               <div className="bg-white rounded-xl border p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Subject Breakdown</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.bookingsBySubject.map(s => (
                        <div key={s._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div><div className="font-bold text-indigo-900">{s._id}</div><div className="text-[10px] text-slate-500 truncate w-40">{s.name}</div></div>
                            <span className="bg-white px-3 py-1 rounded shadow-sm font-mono font-bold text-slate-700">{s.count}</span>
                        </div>
                    ))}
                    {stats.bookingsBySubject.length === 0 && <p className="text-slate-400 text-sm italic">No classes recorded yet.</p>}
                  </div>
               </div>
             </div>
          )}

        </main>
      </div>
    </div>
  );
}