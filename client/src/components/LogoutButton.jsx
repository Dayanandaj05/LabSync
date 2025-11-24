import React from "react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  function logout() {
    // ✅ FIX: Remove BOTH items to fully clear session
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Force reload to reset any app state
    navigate("/login");
    window.location.reload(); 
  }

  return (
    <button
      onClick={logout}
      className="text-xs text-red-600 font-bold hover:underline hover:text-red-800 transition"
    >
      Logout
    </button>
  );
}
