const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const validateOriginAndCSRF = require('./middleware/csrfMiddleware');
const errorHandler = require('./middleware/errorMiddleware');
const { errorResponse } = require('./utils/apiResponse');

// Route imports
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const menuRoutes = require('./routes/menuRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const requestRoutes = require('./routes/requestRoutes');
const announcementRoutes = require('./routes/announcementRoutes');

const app = express();

// 1. Explicit Trusted Origin CORS with Credentials
const configuredOrigins = config.frontendUrl
  ? config.frontendUrl.split(',').map(url => url.trim())
  : [];

const allowedOrigins = [
  ...configuredOrigins,
  'https://smart-mess-frontend-sumitkurmii.vercel.app',
  'https://smart-mess-frontend.vercel.app',
  'https://smart-mess-frontend-ja5oal4oi-sumitkurmii.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].map(url => url.toLowerCase().replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      // Disallow origin in CORS headers; request then validated by CSRF middleware
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Smart-Mess-Client', 'Accept'],
    optionsSuccessStatus: 204
  })
);

// 2. Parsers
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3. CSRF & Origin Validation for state-changing requests with cookie sessions
app.use(validateOriginAndCSRF);

// 4. API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/config/rules', ruleRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/announcements', announcementRoutes);

// 5. Catch-all for undefined routes
app.use('*', (req, res) => {
  return errorResponse(res, `Route '${req.originalUrl}' not found on this server.`, 404);
});

// 6. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
