import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send and receive httpOnly cookies across origins
  headers: {
    'Content-Type': 'application/json',
    'X-Smart-Mess-Client': 'web-v1' // Custom header satisfying CSRF preflight requirements
  }
});

// Interceptor to handle global API errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardized error message extraction
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      status: error.response?.status,
      message,
      errors: error.response?.data?.errors,
      originalError: error
    });
  }
);

export const authApi = {
  healthCheck: () => apiClient.get('/health'),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
  testAdminAccess: () => apiClient.get('/auth/admin-only-test')
};

export const rulesApi = {
  getRules: () => apiClient.get('/config/rules'),
  updateRules: (rules) => apiClient.put('/config/rules', rules)
};

export const menuApi = {
  getDailyMenu: (date) => apiClient.get('/menu/daily', { params: { date } }),
  getWeeklyMenu: (startDate) => apiClient.get('/menu/weekly', { params: { startDate } }),
  saveMenu: (data) => apiClient.post('/menu', data),
  deleteMenu: (id) => apiClient.delete(`/menu/${id}`)
};

export const bookingApi = {
  getMyBookings: (startDate, endDate) => apiClient.get('/bookings/my', { params: { startDate, endDate } }),
  saveBooking: (data) => apiClient.post('/bookings', data),
  saveBulkBookings: (bookings) => apiClient.post('/bookings/bulk', { bookings }),
  getHeadcount: (date) => apiClient.get('/bookings/headcount', { params: { date } })
};

export const attendanceApi = {
  checkIn: (data) => apiClient.post('/attendance/check-in', data),
  getMyAttendance: (params) => apiClient.get('/attendance/my', { params }),
  getAdminAttendance: (params) => apiClient.get('/attendance/admin/list', { params }),
  getAnalytics: (date) => apiClient.get('/attendance/admin/analytics', { params: { date } }),
  recordAdminAttendance: (data) => apiClient.post('/attendance/admin/record', data),
  correctAttendance: (id, data) => apiClient.put(`/attendance/admin/${id}`, data),
  getStudentsList: (params) => apiClient.get('/attendance/admin/students', { params })
};

export const ratingsApi = {
  submitRating: (data) => apiClient.post('/ratings', data),
  getMyRatings: (params) => apiClient.get('/ratings/my', { params }),
  getEligibleMeals: () => apiClient.get('/ratings/eligible'),
  getAdminRatings: (params) => apiClient.get('/ratings/admin', { params })
};

export const complaintsApi = {
  submitComplaint: (data) => apiClient.post('/complaints', data),
  getMyComplaints: (params) => apiClient.get('/complaints/my', { params }),
  getAdminComplaints: (params) => apiClient.get('/complaints/admin', { params }),
  updateComplaintStatus: (id, data) => apiClient.put(`/complaints/admin/${id}`, data)
};

export const requestsApi = {
  submitRequest: (data) => apiClient.post('/requests', data),
  getMyRequests: (params) => apiClient.get('/requests/my', { params }),
  getAdminRequests: (params) => apiClient.get('/requests/admin', { params }),
  updateRequestStatus: (id, data) => apiClient.put(`/requests/admin/${id}`, data)
};

export const announcementsApi = {
  getAnnouncements: (params) => apiClient.get('/announcements', { params }),
  getAdminAnnouncements: (params) => apiClient.get('/announcements/admin', { params }),
  createAnnouncement: (data) => apiClient.post('/announcements/admin', data),
  updateAnnouncement: (id, data) => apiClient.put(`/announcements/admin/${id}`, data),
  deleteAnnouncement: (id) => apiClient.delete(`/announcements/admin/${id}`)
};

export default apiClient;
