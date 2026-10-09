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

const app = express();

// 1. Explicit Trusted Origin CORS with Credentials
const allowedOrigins = [
  config.frontendUrl,
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Smart-Mess-Client']
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

// 5. Catch-all for undefined routes
app.use('*', (req, res) => {
  return errorResponse(res, `Route '${req.originalUrl}' not found on this server.`, 404);
});

// 6. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
