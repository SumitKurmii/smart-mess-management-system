const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_mess',
  dbName: process.env.MONGODB_DB_NAME || 'smart_mess',
  jwtSecret: process.env.JWT_SECRET || 'fallback_development_secret_min_32_characters_long_for_security',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  messTimezone: process.env.MESS_TIMEZONE || 'Asia/Kolkata',
  adminInitial: {
    name: process.env.ADMIN_INITIAL_NAME || 'System Administrator',
    email: process.env.ADMIN_INITIAL_EMAIL || 'admin@mess.local',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@SecurePass2026!'
  }
};

module.exports = config;
