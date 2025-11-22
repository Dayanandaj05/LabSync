import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import RequireAuth from "./components/RequireAuth";

export default function App() {
  const location = useLocation();

  const noLayoutPages = ["/login", "/register"];
  const hideLayout = noLayoutPages.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">

      {/* HEADER */}
      {!hideLayout && (
        <header className="w-full bg-white shadow-sm py-4 px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">LabSync</h1>
          <nav>
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Home
            </a>
          </nav>
        </header>
      )}

      {/* PAGE CONTENT */}
      {hideLayout ? (
        <div className="flex items-center justify-center w-full min-h-screen">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      ) : (
        <main className="max-w-5xl mx-auto py-6 px-4">
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
      )}
    </div>
  );
}
