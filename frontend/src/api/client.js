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

export default apiClient;
