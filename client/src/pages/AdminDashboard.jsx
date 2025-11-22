import React, { useEffect, useState } from "react";
import API from "../services/api";
import { BarChart, StatCard } from "../components/AdminCharts";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [token] = useState(localStorage.getItem("token") || "");
  const [activeTab, setActiveTab] = useState("pending"); 
  
  // ✅ NEW: Announcement State
  const [announcementMsg, setAnnouncementMsg] = useState("");

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
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [token, activeTab]);

  // --- ACTIONS ---
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;
    try {
      await API.post('/api/admin/announcements', { message: announcementMsg, type: 'Info' }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Announcement Posted!");
      setAnnouncementMsg("");
    } catch (err) { alert("Failed to post"); }
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
    if (!confirm("Cancel this booking permanently?")) return;
    try {
      await API.delete(`/api/admin/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (selectedUser) handleViewUser(selectedUser);
      else fetchData();
    } catch (err) { alert("Failed"); }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const labChartData = stats ? stats.bookingsByLab.map(l => ({ label: l._id, value: l.count })) : [];
  const roleChartData = stats ? stats.bookingsByRole.map(r => ({ label: r._id, value: r.count })) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-slate-200 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          
          {/* ✅ QUICK ACTIONS: RECURRING / CSV */}
          <div className="flex gap-3 mt-3">
             <Link to="/recurring" className="text-xs bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-700 transition font-bold flex items-center gap-2">
               <span>🔄</span> Schedule Recurring / Tests
             </Link>
             <a href="http://localhost:5001/api/admin/export-csv" target="_blank" className="text-xs bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded hover:bg-slate-50 transition flex items-center gap-2 font-bold">
               <span>⬇</span> Download Report
             </a>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 shadow-inner">
          {['pending', 'history', 'users'].map(tab => (
            <button 
              key={tab} onClick={() => { setActiveTab(tab); setSelectedUser(null); }}
              className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${activeTab === tab ? 'bg-white shadow-sm text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ✅ NEW: ANNOUNCEMENT INPUT */}
      <div className="mb-8 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-4 items-center">
        <span className="text-2xl">📢</span>
        <form onSubmit={handlePostAnnouncement} className="flex-1 flex gap-2">
          <input 
            type="text" 
            placeholder="Post a global announcement (e.g. 'Labs closed tomorrow')" 
            value={announcementMsg}
            onChange={(e) => setAnnouncementMsg(e.target.value)}
            className="flex-1 p-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">Post</button>
        </form>
      </div>
      
      {/* STATS & CHARTS */}
      {stats && (
        <section className="mb-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="blue" />
          <StatCard title="Total Bookings" value={stats.totalBookings} icon="📅" color="purple" />
          <div className="md:col-span-1"><BarChart title="Most Popular Labs" data={labChartData} color="green" /></div>
          <div className="md:col-span-1"><BarChart title="Bookings by Role" data={roleChartData} color="orange" /></div>
        </section>
      )}

      {/* PENDING TAB */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-lg font-bold mb-4">New Users ({pendingUsers.length})</h2>
            {pendingUsers.length === 0 ? <p className="text-slate-400 italic text-sm">All clear.</p> : (
              <ul className="space-y-3">
                {pendingUsers.map(u => (
                  <li key={u._id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                    <div><p className="font-bold text-sm">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction('users', u._id, 'approve')} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">✓</button>
                      <button onClick={() => handleAction('users', u._id, 'reject')} className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Booking Requests ({pendingBookings.length})</h2>
            {pendingBookings.length === 0 ? <p className="text-slate-400 italic text-sm">No pending bookings.</p> : (
              <ul className="space-y-4">
                {pendingBookings.map(b => (
                  <li key={b._id} className="p-4 bg-slate-50 rounded-xl border relative group hover:shadow-md">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">{b.creatorName}</span>
                      <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded-full">{b.role}</span>
                    </div>
                    <div className="text-sm text-slate-600 mb-3">Lab <strong>{b.labCode}</strong> • {b.date} • P{b.period} <div className="mt-1 text-xs italic">"{b.purpose}"</div></div>
                    <div className="flex gap-3">
                      <button onClick={() => handleAction('bookings', b._id, 'approve')} className="flex-1 bg-slate-900 text-white py-2 rounded text-xs font-bold">Approve</button>
                      <button onClick={() => handleAction('bookings', b._id, 'reject')} className="flex-1 bg-white border text-slate-600 py-2 rounded text-xs font-bold">Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <section className="bg-white p-6 rounded-2xl border shadow-sm animate-fade-in">
          <h2 className="text-lg font-bold mb-6">Action History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">User</th><th className="p-3">Details</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
              <tbody className="divide-y">
                {bookingHistory.map(b => (
                  <tr key={b._id}>
                    <td className="p-3">{formatDate(b.updatedAt)}</td>
                    <td className="p-3 font-bold">{b.creatorName}</td>
                    <td className="p-3">Lab {b.labCode}, P{b.period} <br/><span className="text-xs text-slate-400">{b.date}</span></td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status==='Approved'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{b.status}</span></td>
                    <td className="p-3"><button onClick={() => handleCancelBooking(b._id)} className="text-red-500 underline text-xs font-bold">Cancel</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <div className="bg-white border rounded-2xl overflow-hidden h-[600px] flex flex-col">
            <div className="p-4 border-b bg-slate-50">
              <input type="text" placeholder="🔍 Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none" />
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {filteredUsers.map(u => (
                <div key={u._id} onClick={() => handleViewUser(u)} className={`p-3 rounded-xl cursor-pointer transition-all ${selectedUser?._id === u._id ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}>
                  <div className="font-bold text-sm">{u.name}</div>
                  <div className="text-xs opacity-80">{u.email}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-white border rounded-2xl p-8 h-[600px] overflow-y-auto">
            {!selectedUser ? <div className="h-full flex items-center justify-center text-slate-300">Select a user</div> : (
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedUser.name}</h2>
                <p className="text-slate-500 text-sm mb-6">{selectedUser.email} • {selectedUser.role}</p>
                <h3 className="font-bold text-sm uppercase text-slate-400 mb-4">History</h3>
                {userBookings.length === 0 ? <p className="text-sm italic">No bookings.</p> : (
                  <div className="space-y-3">
                    {userBookings.map(b => (
                      <div key={b._id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border">
                        <div><div className="font-bold text-sm">Lab {b.lab?.code} • P{b.period}</div><div className="text-xs text-slate-500">{b.date}</div></div>
                        <div className="flex gap-3 items-center">
                           <span className={`px-2 py-1 rounded text-xs ${b.status==='Approved'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{b.status}</span>
                           <button onClick={() => handleCancelBooking(b._id)} className="text-red-500 font-bold text-xs">Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}