import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const signup = (email, password, role) => 
  api.post('/auth/signup', { email, password, role });

export const login = (email, password) => 
  api.post('/auth/login', { email, password });

// Admin
export const getSensorData = (limit = 100) => 
  api.get(`/admin/data?limit=${limit}`);

export const getAnalytics = () => 
  api.get('/admin/analytics');

export const overrideLock = (device_id, override) => 
  api.post('/admin/override-lock', { device_id, override });

export const getTamperAlerts = (limit = 50, unread_only = false) => 
  api.get(`/admin/alerts?limit=${limit}&unread_only=${unread_only}`);

export const getUnreadAlertCount = () => 
  api.get('/admin/alerts/count');

export const markAlertRead = (alert_id) => 
  api.patch(`/admin/alerts/${alert_id}/read`);

export const markAllAlertsRead = () => 
  api.patch('/admin/alerts/read-all');

// Shipment
export const createShipment = (customer_phone, lat, lng, radius, assigned_driver_email = null) => 
  api.post('/shipment/create', { customer_phone, lat, lng, radius, assigned_driver_email });

export const getAllShipments = () => 
  api.get('/shipment/all');

export const getMyShipments = () => 
  api.get('/shipment/my-shipments');

export const getQRCode = (unique_id) => 
  api.get(`/shipment/qr/${unique_id}`);

export const deleteShipment = (unique_id) => 
  api.delete(`/shipment/${unique_id}`);

// Drivers
export const getAllDrivers = () => 
  api.get('/auth/drivers');

// OTP
export const generateOTP = (unique_id) => 
  api.post('/otp/generate', { unique_id });

export const verifyOTP = (unique_id, otp, current_lat, current_lng, device_id) => 
  api.post('/otp/verify', { unique_id, otp, current_lat, current_lng, device_id });

export const lockBox = (device_id = 'BOX_001') =>
  api.post(`/otp/lock?device_id=${device_id}`);

// Device (for testing)
export const postSensorData = (data) => 
  api.post('/data', data);

export const getCommand = (device_id = 'BOX_001') => 
  api.get(`/command?device_id=${device_id}`);

// Public sensor data endpoint (no auth required)
export const getLatestSensorData = (limit = 1) => 
  api.get(`/sensor/latest?limit=${limit}`);

export const getSafeScore = (device_id = 'BOX_001') =>
  api.get(`/safe-score?device_id=${device_id}`);

export default api;
