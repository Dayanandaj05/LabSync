import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom"; // ✅ Added Link
import { loginUser } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // ✅ Error state

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
      const res = await loginUser(email, password);

      if (res?.token) {
        localStorage.setItem("token", res.token);
        // ✅ Save User info so Booking Modal knows who you are
        localStorage.setItem("user", JSON.stringify(res.user)); 
        navigate(from, { replace: true });
      }
    } catch (err) {
      // ✅ Show error message from backend
      setError(err.response?.data?.error || "Login failed. Check console.");
      console.error(err);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-xl p-10 rounded-xl w-96 animate-fade-in">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">LabSync Login</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200">
            Login
          </button>
        </form>

        {/* ✅ REGISTER LINK ADDED HERE */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}