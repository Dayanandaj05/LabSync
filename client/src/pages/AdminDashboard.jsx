import React, { useEffect, useState } from "react";
import API from "../services/api";
import { BarChart } from "../components/AdminCharts";
import { Link } from "react-router-dom";
import { deleteMaintenance, getLabs } from "../services/admin";

export default function AdminDashboard() {
  // Data State
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]); 
  const [activeMaintenance, setActiveMaintenance] = useState([]); 
  
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
  
  // Reports State
  const [reportData, setReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState({ lab: 'All', role: 'All', status: 'All', user: 'All', subject: 'All', startDate: '', endDate: '', sortBy: 'date', order: 'desc' });
  const [reportType, setReportType] = useState('bookings');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  
  // CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [semesterStartDate, setSemesterStartDate] = useState("");
  const [semesterEndDate, setSemesterEndDate] = useState("");

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
        const listRes = await API.get("/api/admin/data/users", { headers: { Authorization: `Bearer ${token}` } });
        setUsersList(listRes.data.users || []);
      }
      if (activeTab === 'reports') {
        const usersRes = await API.get("/api/admin/data/users", { headers: { Authorization: `Bearer ${token}` } });
        const subjectsRes = await API.get("/api/admin/subjects", { headers: { Authorization: `Bearer ${token}` } });
        setAvailableUsers(usersRes.data.users || []);
        setAvailableSubjects(subjectsRes.data.subjects || []);
      }
      if (activeTab === 'subjects') {
        const subRes = await API.get("/api/admin/subjects", { headers: { Authorization: `Bearer ${token}` } });
        setSubjects(subRes.data.subjects || []);
      }
      if (activeTab === 'announcements') {
        const annRes = await API.get("/api/admin/announcements", { headers: { Authorization: `Bearer ${token}` } });
        setAnnouncementsList(annRes.data.announcements || []);
      }
      if (activeTab === 'maintenance') {
         const labsData = await getLabs(token);
         const flatMaintenance = [];
         labsData.labs.forEach(l => {
             if(l.maintenanceLog && l.maintenanceLog.length > 0) {
                 l.maintenanceLog.forEach(log => {
                     flatMaintenance.push({ ...log, labCode: l.code });
                 });
             }
         });
         setActiveMaintenance(flatMaintenance.sort((a,b) => new Date(b.start) - new Date(a.start)));
      }

    } catch (err) { console.error("Fetch Error:", err); }
  };

  useEffect(() => { fetchData(); }, [token, activeTab]);
  useEffect(() => { if (activeTab === 'reports') fetchReportData(); }, [reportFilters, reportType, activeTab]);

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
      fetchData(); 
    } catch (err) { alert("Failed: " + (err.response?.data?.error || err.message)); }
  };

  const handleRemoveMaintenance = async (labCode, logId) => {
      if(!confirm("Remove this maintenance block? The grid will become free immediately.")) return;
      try {
          await deleteMaintenance(labCode, logId, token);
          fetchData();
      } catch(err) { alert(err.message); }
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

  const fetchReportData = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams(reportFilters);
      const res = await API.get(`/api/admin/data/${reportType}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setReportData(res.data[reportType] || []);
    } catch (err) { alert("Failed to fetch report data"); }
  };

  const handleFilterChange = (key, value) => {
    setReportFilters(prev => ({ ...prev, [key]: value }));
  };

  const generateCSVUrl = () => {
    const params = new URLSearchParams(reportFilters);
    return `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/admin/export-csv?${params}&token=${token}`;
  };

  const generatePDFUrl = () => {
    const params = new URLSearchParams(reportFilters);
    return `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/admin/export-pdf?${params}&token=${token}`;
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target.result;
      const lines = csv.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Map flexible headers to standard keys
      const headerMap = {};
      headers.forEach((header, index) => {
        if (header.includes('start')) headerMap.startDate = index;
        else if (header.includes('end')) headerMap.endDate = index;
        else if (header.includes('date') && !header.includes('start') && !header.includes('end')) headerMap.date = index;
        else if (header.includes('day')) headerMap.day = index;
        else if (header.includes('period')) headerMap.period = index;
        else if (header.includes('lab')) headerMap.lab = index;
        else if (header.includes('subject')) headerMap.subject = index;
        else if (header.includes('purpose') || header.includes('title') || header.includes('class')) headerMap.purpose = index;
      });
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          startDate: values[headerMap.startDate] || '',
          endDate: values[headerMap.endDate] || '',
          date: values[headerMap.date] || '',
          day: values[headerMap.day] || '',
          period: values[headerMap.period] || '',
          lab: values[headerMap.lab] || '',
          subject: values[headerMap.subject] || '',
          purpose: values[headerMap.purpose] || ''
        };
      });
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const handleBulkBooking = async () => {
    if (csvData.length === 0) return alert('No CSV data to process');
    console.log('CSV Data:', csvData);
    
    const firstRow = csvData[0];
    console.log('First row:', firstRow);
    
    if (!firstRow.startDate && !firstRow.endDate && !firstRow.date) {
      return alert('CSV must include date columns (startDate/endDate or specific dates)');
    }
    
    const confirmMsg = firstRow.date ? 
      `Upload ${csvData.length} specific date entries?` : 
      `Upload ${csvData.length} timetable entries for semester ${firstRow.startDate} to ${firstRow.endDate}?`;
      
    if (!confirm(confirmMsg)) return;
    
    try {
      console.log('Sending bulk timetable request...');
      const response = await API.post('/api/admin/bulk-timetable', { timetable: csvData }, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Response:', response.data);
      alert(response.data.message || 'Timetable uploaded successfully!');
      setCsvData([]);
      setCsvFile(null);
      setShowCsvUpload(false);
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.response?.data?.error || 'Upload failed');
    }
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
      
      {/* TOOLBAR */}
      <div className="bg-white border-b px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-sm z-20">
         {stats && (
           <div className="flex gap-3 text-xs font-bold">
             <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 shadow-sm flex items-center gap-2">👥 Users: {stats.totalUsers}</div>
             <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200 shadow-sm flex items-center gap-2">📅 Bookings: {stats.totalBookings}</div>
           </div>
         )}
         <div className="flex items-center gap-4 text-xs overflow-x-auto no-scrollbar">
            <form onSubmit={handleMaintenance} className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
               <select className="px-1 py-1 bg-transparent font-bold text-red-900 outline-none" value={mLab} onChange={e=>setMLab(e.target.value)}><option>CC</option><option>IS</option><option>CAT</option></select>
               <input type="date" className="px-1 py-1 bg-transparent w-24 outline-none" value={mStart} onChange={e=>setMStart(e.target.value)} required />
               <span className="text-red-300">-</span>
               <input type="date" className="px-1 py-1 bg-transparent w-24 outline-none" value={mEnd} onChange={e=>setMEnd(e.target.value)} required />
               <button type="submit" className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Block</button>
            </form>
            <div className="w-px h-6 bg-slate-200"></div>
            <Link to="/recurring" className="bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-black transition whitespace-nowrap">🔄 Recurrence</Link>
            <button onClick={() => setShowCsvUpload(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition whitespace-nowrap">📄 Upload Timetable</button>
            <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/admin/export-csv?token=${token}`} target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition font-bold whitespace-nowrap">⬇ CSV</a>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <nav className="w-48 bg-white border-r flex flex-col pt-4 shrink-0 overflow-y-auto">
          <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Dashboard</div>
          {['Pending', 'History', 'Reports', 'Maintenance', 'Announcements', 'Users', 'Subjects', 'Analytics'].map(tab => (
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
                       <th className="p-3 text-center">Waitlist</th>
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

          {/* TAB: MAINTENANCE */}
          {activeTab === 'maintenance' && (
             <div className="flex flex-col h-full gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                   <h3 className="font-bold text-lg mb-4 text-red-800 flex items-center gap-2">⛔ Block Lab Access</h3>
                   <form onSubmit={handleMaintenance} className="flex flex-col md:flex-row gap-3 items-end">
                      <div className="flex-1">
                         <label className="block text-xs font-bold text-slate-500 mb-1">Select Lab</label>
                         <select className="w-full p-2 border rounded bg-slate-50 font-bold" value={mLab} onChange={e=>setMLab(e.target.value)}><option>CC</option><option>IS</option><option>CAT</option></select>
                      </div>
                      <div className="flex-1">
                         <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                         <input type="date" className="w-full p-2 border rounded" value={mStart} onChange={e=>setMStart(e.target.value)} required />
                      </div>
                      <div className="flex-1">
                         <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                         <input type="date" className="w-full p-2 border rounded" value={mEnd} onChange={e=>setMEnd(e.target.value)} required />
                      </div>
                      <div className="flex-[2]">
                         <label className="block text-xs font-bold text-slate-500 mb-1">Reason</label>
                         <input type="text" placeholder="e.g. Hardware Repair" className="w-full p-2 border rounded" value={mReason} onChange={e=>setMReason(e.target.value)} required />
                      </div>
                      <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 shadow-sm">Block</button>
                   </form>
                </div>
                <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                   <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">Active Maintenance Blocks</div>
                   <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                      {activeMaintenance.length === 0 ? (
                          <div className="text-center text-slate-400 italic py-10">No active maintenance blocks.</div>
                      ) : (
                          <table className="min-w-full text-sm text-left">
                             <thead className="text-slate-400 border-b"><tr><th className="pb-2">Lab</th><th className="pb-2">Duration</th><th className="pb-2">Reason</th><th className="pb-2 text-right">Action</th></tr></thead>
                             <tbody className="divide-y">
                                {activeMaintenance.map(m => (
                                   <tr key={m._id} className="group hover:bg-red-50">
                                      <td className="py-3 font-bold font-mono text-red-800">{m.labCode}</td>
                                      <td className="py-3 text-slate-600">
                                         {new Date(m.start).toLocaleDateString()} <span className="text-slate-300 mx-1">➞</span> {new Date(m.end).toLocaleDateString()}
                                      </td>
                                      <td className="py-3 italic text-slate-500">{m.reason}</td>
                                      <td className="py-3 text-right">
                                         <button onClick={() => handleRemoveMaintenance(m.labCode, m._id)} className="text-red-500 border border-red-200 px-3 py-1 rounded text-xs font-bold hover:bg-red-600 hover:text-white transition">Remove</button>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
             <div className="flex flex-col h-full gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                   <h3 className="font-bold text-lg mb-4">📢 Post Announcement</h3>
                   <form onSubmit={handlePostAnnouncement} className="flex flex-col md:flex-row gap-3 items-stretch">
                      <input className="flex-[2] p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type here..." value={announcementMsg} onChange={e=>setAnnouncementMsg(e.target.value)} />
                      <select className="p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700" value={announcementType} onChange={e=>setAnnouncementType(e.target.value)}>
                         <option value="Info">ℹ️ Info</option><option value="Warning">⚠️ Warning</option><option value="Test">🔧 Test</option>
                      </select>
                      <div className="flex items-center border rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                        <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Duration:</span>
                        <input type="number" min="1" max="365" className="w-12 outline-none font-bold text-slate-700 text-center" value={announcementDuration} onChange={e=>setAnnouncementDuration(e.target.value)} />
                        <span className="text-xs font-bold text-slate-400 ml-1">Days</span>
                      </div>
                      <button type="submit" className="bg-slate-900 text-white px-6 rounded-lg font-bold hover:bg-black transition shadow-lg whitespace-nowrap">Post</button>
                   </form>
                </div>
                <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                   <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">Active & Past</div>
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

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && (
            <div className="flex flex-col h-full gap-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <select value={reportType} onChange={e => setReportType(e.target.value)} className="px-3 py-2 border rounded-lg font-bold">
                    <option value="bookings">📅 Bookings</option>
                    <option value="users">👥 Users</option>
                    <option value="labs">🏢 Labs</option>
                  </select>
                  {reportType === 'bookings' && (
                    <>
                      <select value={reportFilters.lab} onChange={e => handleFilterChange('lab', e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="All">All Labs</option>
                        <option value="CC">CC</option>
                        <option value="IS">IS</option>
                        <option value="CAT">CAT</option>
                      </select>
                      <select value={reportFilters.role} onChange={e => handleFilterChange('role', e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="All">All Roles</option>
                        <option value="Student">Students</option>
                        <option value="Staff">Staff</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <select value={reportFilters.status} onChange={e => handleFilterChange('status', e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="All">All Status</option>
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <select value={reportFilters.user} onChange={e => handleFilterChange('user', e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="All">All Users</option>
                        {availableUsers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                      </select>
                      <select value={reportFilters.subject} onChange={e => handleFilterChange('subject', e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="All">All Subjects</option>
                        {availableSubjects.map(s => <option key={s._id} value={s._id}>{s.code}</option>)}
                      </select>
                      <input type="date" value={reportFilters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="px-3 py-2 border rounded-lg" placeholder="Start Date" />
                      <input type="date" value={reportFilters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="px-3 py-2 border rounded-lg" placeholder="End Date" />
                    </>
                  )}
                  <select value={reportFilters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)} className="px-3 py-2 border rounded-lg">
                    {reportType === 'bookings' && (
                      <>
                        <option value="date">Sort by Date</option>
                        <option value="createdAt">Sort by Created</option>
                        <option value="period">Sort by Period</option>
                      </>
                    )}
                    {reportType === 'users' && (
                      <>
                        <option value="name">Sort by Name</option>
                        <option value="role">Sort by Role</option>
                        <option value="createdAt">Sort by Joined</option>
                      </>
                    )}
                    {reportType === 'labs' && (
                      <>
                        <option value="code">Sort by Code</option>
                        <option value="name">Sort by Name</option>
                        <option value="capacity">Sort by Capacity</option>
                      </>
                    )}
                  </select>
                  <select value={reportFilters.order} onChange={e => handleFilterChange('order', e.target.value)} className="px-3 py-2 border rounded-lg">
                    <option value="asc">↑ Ascending</option>
                    <option value="desc">↓ Descending</option>
                  </select>
                  <a href={generateCSVUrl()} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">⬇ CSV</a>
                  <a href={generatePDFUrl()} target="_blank" rel="noopener noreferrer" className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700">📄 PDF</a>
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-bold text-slate-700 flex justify-between">
                  <span>{reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</span>
                  <span className="bg-slate-200 px-2 rounded-full text-xs">{reportData.length} items</span>
                </div>
                <div className="overflow-auto h-full custom-scrollbar">
                  {reportType === 'bookings' && (
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Lab</th><th className="p-3 text-left">User</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Status</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.map(b => (
                          <tr key={b._id} className="hover:bg-slate-50">
                            <td className="p-3">{b.date} P{b.period}</td>
                            <td className="p-3 font-mono">{b.labCode}</td>
                            <td className="p-3">{b.creatorName}<br/><span className="text-xs text-slate-400">{b.subject?.code}</span></td>
                            <td className="p-3">{b.role}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${b.status==='Approved'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{b.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {reportType === 'users' && (
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Class</th><th className="p-3 text-left">Status</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.map(u => (
                          <tr key={u._id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold">{u.name}</td>
                            <td className="p-3 text-slate-600">{u.email}</td>
                            <td className="p-3">{u.role}</td>
                            <td className="p-3">{u.classGroup}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${u.status==='Approved'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{u.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {reportType === 'labs' && (
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Name</th><th className="p-3 text-left">Capacity</th><th className="p-3 text-left">Maintenance</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.map(l => (
                          <tr key={l._id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold">{l.code}</td>
                            <td className="p-3">{l.name}</td>
                            <td className="p-3">{l.capacity}</td>
                            <td className="p-3">{l.maintenanceLog?.length || 0} blocks</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
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
                  </div>
               </div>
             </div>
          )}

        </main>
      </div>
      
      {/* CSV UPLOAD MODAL */}
      {showCsvUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Upload Semester Timetable</h3>
            <p className="text-sm text-slate-600 mb-4">CSV accepts flexible headers: start, end, date (specific dates), day (recurring), period, lab, subject, purpose/title/class</p>
            
            <input type="file" accept=".csv" onChange={handleCsvUpload} className="mb-4 w-full p-2 border rounded" />
            
            {csvData.length > 0 && (
              <div className="mb-4">
                <p className="font-bold text-green-600">{csvData.length} entries loaded</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2 text-xs">
                  {csvData.slice(0, 5).map((row, i) => (
                    <div key={i} className="mb-1">{JSON.stringify(row)}</div>
                  ))}
                  {csvData.length > 5 && <div>...and {csvData.length - 5} more</div>}
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button onClick={() => setShowCsvUpload(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleBulkBooking} disabled={csvData.length === 0} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">Upload Timetable</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}