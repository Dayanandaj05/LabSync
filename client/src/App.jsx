import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, Link, useNavigate } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import MyBookings from "./pages/MyBookings.jsx"; 
import RecurringBooking from "./pages/RecurringBooking.jsx"; 

import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";
import AnnouncementBanner from "./components/AnnouncementBanner.jsx"; 

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const noLayoutPages = ["/login", "/register"];
  const hideLayout = noLayoutPages.includes(location.pathname);
  
  // ✅ FIX: Manage User State Reactively
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
        setUser(JSON.parse(storedUser));
    } else {
        // 🛑 Force Logout if token is missing (Fixes the bug)
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    }
  }, [location.pathname]); // Re-check on every page navigation

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      


      {/* HEADER */}
      {!hideLayout && (
        <header className="w-full bg-white shadow-sm py-4 px-6 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">
            <Link to="/">LabSync</Link>
          </h1>
          <nav className="flex gap-6 items-center">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Home</Link>
            
            {user && (
              <Link to="/my-bookings" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">My History</Link>
            )}

            {/* Staff/Admin Links */}
            {user && ['Admin', 'Staff'].includes(user.role) && (
               <Link to="/recurring" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition font-bold">
                 + Recurrence / Tests
               </Link>
            )}

            {user?.role === 'Admin' && (
              <Link to="/admin" className="text-sm font-bold text-purple-600 hover:text-purple-800 transition">Admin Panel</Link>
            )}
          </nav>
        </header>
      )}

      {/* PAGE CONTENT */}
      <main className={hideLayout ? "w-full" : "max-w-7xl mx-auto py-6 px-4"}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
          
          <Route path="/my-bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
          
          <Route path="/recurring" element={<RequireAuth><RecurringBooking /></RequireAuth>} />

          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        </Routes>
      </main>
    </div>
  );
}