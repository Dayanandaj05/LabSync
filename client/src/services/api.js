import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  headers: { 'Content-Type': 'application/json' }
});

export async function getFreeLabs(date){
  return API.get(`/api/public/free-labs`, { params: { date } }).then(r=>r.data);
}
export async function getLogs(limit=50){
  return API.get(`/api/public/logs`, { params: { limit } }).then(r=>r.data);
}
export async function createBooking(payload, token){
  // token optional; backend currently supports ?testUserRole for dev
  return API.post(`/api/bookings`, payload, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}
export default API;
