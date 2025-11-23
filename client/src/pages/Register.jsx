import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import API from "../services/api"; 

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Student",
    classGroup: "G1" // ✅ Default
  });

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/");
  }, [navigate]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    try {
      const res = await API.post('/api/auth/register', form);
      alert(res.data.message || "Registration successful! Please wait for Admin approval.");
      navigate("/login");
    } catch (err) {
      console.error("Registration Error:", err);
      setError(err.response?.data?.error || "Registration failed. Try again.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-xl border border-gray-200 w-96 animate-fade-in">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800">Register</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <input
            type="text" name="name" placeholder="Full Name" required onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="email" name="email" placeholder="Email" required onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="password" name="password" placeholder="Password" required onChange={handleChange}
            className="w-full px-4 py-3 border rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <select name="role" onChange={handleChange} className="w-full px-4 py-3 border rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="Student">Student</option>
            <option value="Staff">Staff</option>
          </select>

          {/* ✅ Class Group Selection (Only shows for Student conceptually, but simpler to always show or hide via CSS) */}
          {form.role === 'Student' && (
            <div className="animate-fade-in">
               <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Class Group</label>
               <select name="classGroup" onChange={handleChange} className="w-full px-4 py-3 border rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none">
                 <option value="G1">G1</option>
                 <option value="G2">G2</option>
               </select>
            </div>
          )}

          <button type="submit" className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition duration-200">
            Register
          </button>
        </form>

        <p className="text-center mt-5 text-sm text-gray-600">
          Already have an account? <Link to="/login" className="ml-2 text-blue-600 underline font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}