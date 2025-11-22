import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";

export default function App() {
  const location = useLocation();
  const noLayoutPages = ["/login", "/register"];
  const hideLayout = noLayoutPages.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* HEADER */}
      {!hideLayout && (
        <header className="w-full bg-white shadow-sm py-4 px-6 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-xl font-semibold text-blue-600">LabSync</h1>
          <nav className="flex gap-4 items-center">
            <a href="/" className="text-sm font-medium hover:text-blue-600">Home</a>
          </nav>
        </header>
      )}

      {/* PAGE CONTENT */}
      <main className={hideLayout ? "w-full" : "max-w-7xl mx-auto py-6 px-4"}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* ✅ PUBLIC HOME: No <RequireAuth> wrapper */}
          <Route path="/" element={<Home />} />

          {/* ADMIN DASHBOARD */}
          <Route path="/admin" element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          } />

        </Routes>
      </main>
    </div>
  );
}