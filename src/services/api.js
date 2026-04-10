import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// On 401 → clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('finance_token');
      localStorage.removeItem('finance_user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// Auth
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
};

// Users (admin only)
export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, newPassword) => api.put(`/users/${id}/reset-password`, { newPassword }),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  delete: (id) => api.delete(`/users/${id}`),
};

// Borrowers
export const borrowerAPI = {
  getAll: () => api.get('/borrowers'),
  getById: (id) => api.get(`/borrowers/${id}`),
  create: (data) => api.post('/borrowers', data),
  update: (id, data) => api.put(`/borrowers/${id}`, data),
  delete: (id) => api.delete(`/borrowers/${id}`),
};

// Loans
export const loanAPI = {
  getAll: (status) => api.get('/loans', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/loans/${id}`),
  getByBorrower: (borrowerId) => api.get(`/loans/borrower/${borrowerId}`),
  create: (data, notificationType) => api.post('/loans', data, { params: { notificationType } }),
  markPaid: (loanId, scheduleId, adminAccountId, paidDate, receivedVia, remarks) =>
    api.put(`/loans/${loanId}/schedule/${scheduleId}/pay`, null,
      { params: { receivedVia: receivedVia || 'CASH', ...(adminAccountId ? { adminAccountId } : {}), ...(paidDate ? { paidDate } : {}), ...(remarks ? { remarks } : {}) } }),
  markUnpaid: (loanId, scheduleId) => api.put(`/loans/${loanId}/schedule/${scheduleId}/unpay`),
  closeDaily: (id, adminAccountId, settleDate, receivedVia, remarks) =>
    api.put(`/loans/${id}/close-daily`, null, { params: { receivedVia: receivedVia || 'CASH', ...(adminAccountId ? { adminAccountId } : {}), ...(settleDate ? { settleDate } : {}), ...(remarks ? { remarks } : {}) } }),
  settle: (id, adminAccountId, repaymentDate, receivedVia, remarks) =>
    api.put(`/loans/${id}/settle`, null, { params: { receivedVia: receivedVia || 'CASH', ...(adminAccountId ? { adminAccountId } : {}), ...(repaymentDate ? { repaymentDate } : {}), ...(remarks ? { remarks } : {}) } }),
  extend: (id, extensionMonths, remarks) =>
    api.put(`/loans/${id}/extend`, null, { params: { extensionMonths, ...(remarks ? { remarks } : {}) } }),
  closeEarly: (id, adminAccountId, notificationType, receivedVia, remarks) =>
    api.put(`/loans/${id}/close-early`, null, { params: { receivedVia: receivedVia || 'CASH', ...(adminAccountId ? { adminAccountId } : {}), notificationType, ...(remarks ? { remarks } : {}) } }),
  complete: (id) => api.put(`/loans/${id}/complete`),
  markDefault: (id) => api.put(`/loans/${id}/default`),
  delete: (id) => api.delete(`/loans/${id}`),
};

// Admin
export const adminAPI = {
  getAll: () => api.get('/admins'),
  create: (data) => api.post('/admins', data),
  update: (id, data) => api.put(`/admins/${id}`, data),
  delete: (id) => api.delete(`/admins/${id}`),
  getActiveAccounts: () => api.get('/admins/accounts/active'),
  addAccount: (adminId, data) => api.post(`/admins/${adminId}/accounts`, data),
  updateAccount: (accountId, data) => api.put(`/admins/accounts/${accountId}`, data),
  deleteAccount: (accountId) => api.delete(`/admins/accounts/${accountId}`),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getByBorrower: (borrowerId) => api.get(`/notifications/borrower/${borrowerId}`),
  getByLoan: (loanId) => api.get(`/notifications/loan/${loanId}`),
  resend: (id, type) => api.post(`/notifications/${id}/resend`, null, { params: { type } }),
  testEmail: (to) => api.get('/notifications/test-email', { params: { to } }),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Deposits
export const depositAPI = {
  getAll: (status) => api.get('/deposits', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/deposits/${id}`),
  create: (data) => api.post('/deposits', data),
  repay: (id, repaidDate, repaidVia, repaidRemarks) =>
    api.put(`/deposits/${id}/repay`, null, {
      params: { repaidVia: repaidVia || 'CASH', ...(repaidDate ? { repaidDate } : {}), ...(repaidRemarks ? { repaidRemarks } : {}) },
    }),
  revert: (id) => api.put(`/deposits/${id}/revert`),
  delete: (id) => api.delete(`/deposits/${id}`),
};

// EMI Tracker
export const emiTrackerAPI = {
  getAll: (status) => api.get('/emi-tracker', { params: status ? { status } : {} }),
  getUpcoming: () => api.get('/emi-tracker/upcoming'),
  create: (data) => api.post('/emi-tracker', data),
  update: (id, data) => api.put(`/emi-tracker/${id}`, data),
  markPaid: (id) => api.put(`/emi-tracker/${id}/mark-paid`),
  pause: (id) => api.put(`/emi-tracker/${id}/pause`),
  resume: (id) => api.put(`/emi-tracker/${id}/resume`),
  complete: (id) => api.put(`/emi-tracker/${id}/complete`),
  delete: (id) => api.delete(`/emi-tracker/${id}`),
};

// Expenses
export const expenseAPI = {
  getAll: (startDate, endDate) => api.get('/expenses', { params: { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) } }),
  getById: (id) => api.get(`/expenses/${id}`),
  getSummary: (period) => api.get('/expenses/summary', { params: { period } }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
