import React from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import MyBookings from "./pages/MyBookings.jsx"; 
import RecurringBooking from "./pages/RecurringBooking.jsx"; // ✅ Import

import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";
import AnnouncementBanner from "./components/AnnouncementBanner.jsx"; // ✅ Import Banner

export default function App() {
  const location = useLocation();
  const noLayoutPages = ["/login", "/register"];
  const hideLayout = noLayoutPages.includes(location.pathname);
  
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      
      {/* ✅ GLOBAL ANNOUNCEMENT BANNER (Now Visible) */}
      {!hideLayout && <AnnouncementBanner />}

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

            {/* ✅ Link for Staff/Admin to Recurring Page */}
            {['Admin', 'Staff'].includes(user?.role) && (
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
          
          {/* ✅ Recurring Route */}
          <Route path="/recurring" element={<RequireAuth><RecurringBooking /></RequireAuth>} />

          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        </Routes>
      </main>
    </div>
  );
}