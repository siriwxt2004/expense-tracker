// js/api.js
// รวมฟังก์ชันสำหรับเรียก backend API ไว้ที่เดียว ใช้ได้ทั้งหน้า login และ dashboard

const API_BASE = '/api';

/**
 * เรียก API พร้อมแนบ JWT token อัตโนมัติ (ถ้ามี)
 * @param {string} path - path ต่อจาก /api เช่น '/transactions'
 * @param {object} options - fetch options (method, body, ฯลฯ)
 */
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // ถ้า token หมดอายุหรือไม่ถูกต้อง ให้เด้งกลับไปหน้า login
  if (response.status === 401 || response.status === 403) {
    if (path !== '/auth/login' && path !== '/auth/register') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = 'index.html';
      return Promise.reject(new Error('Session หมดอายุ'));
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
  }

  return data;
}

const api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  getTransactions: (query = '') => apiRequest(`/transactions${query}`),
  getSummary: (query = '') => apiRequest(`/transactions/summary${query}`),
  createTransaction: (payload) => apiRequest('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) => apiRequest(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTransaction: (id) => apiRequest(`/transactions/${id}`, { method: 'DELETE' }),
};
