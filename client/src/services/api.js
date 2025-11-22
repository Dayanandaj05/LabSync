import axios from 'axios';

// Create Axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  headers: { 'Content-Type': 'application/json' }
});

// ✅ Auth Services
export async function loginUser(email, password) {
  const response = await API.post('/api/auth/login', { email, password });
  return response.data; 
}

// ✅ Public Services
export async function getFreeLabs(date){
  return API.get(`/api/public/grid-data`, { params: { date } }).then(r=>r.data);
}

export async function getLogs(limit=50){
  return API.get(`/api/public/logs`, { params: { limit } }).then(r=>r.data);
}

// ✅ Booking Services
export async function createBooking(payload, token){
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  return API.post(`/api/bookings`, payload, config);
}

// Default export for generic requests (get/post/put/delete)
export default API;