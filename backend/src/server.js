const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

let server;

const startServer = async () => {
  try {
    // Attempt database connection
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn(`[Server] Warning: Initial MongoDB connection failed (${dbErr.message}). Server will start, but DB-dependent features require MongoDB.`);
    }

    server = app.listen(config.port, () => {
      console.log('====================================================');
      console.log(`  Smart Mess Management API is running!`);
      console.log(`  Port:             ${config.port}`);
      console.log(`  Environment:      ${config.nodeEnv}`);
      console.log(`  Mess Timezone:    ${config.messTimezone}`);
      console.log(`  Health Check:     http://localhost:${config.port}/api/health`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error(`[Server Fatal Error] ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
