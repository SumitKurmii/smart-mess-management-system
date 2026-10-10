const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

/**
 * Resolves the intended application database name from a MongoDB URI.
 * Guarantees that empty paths or unintended 'test' defaults fall back to the
 * configured application database ('smart_mess').
 */
const resolveDatabaseName = (uri) => {
  const defaultDb = config.dbName || 'smart_mess';
  if (!uri) return defaultDb;

  try {
    const httpUri = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const parsed = new URL(httpUri);
    const path = parsed.pathname.replace(/^\//, '').trim();
    if (!path) return defaultDb;
    const extracted = path.split('/')[0].split('?')[0];
    if (!extracted || extracted.toLowerCase() === 'test') {
      return defaultDb;
    }
    return extracted;
  } catch (err) {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^\/]+\/([^?]+)/);
    const extracted = match ? match[1].trim() : null;
    if (!extracted || extracted.toLowerCase() === 'test') {
      return defaultDb;
    }
    return extracted;
  }
};

const connectDB = async (customUri = null) => {
  const uri = customUri || config.mongodbUri;
  const targetDbName = resolveDatabaseName(uri);

  if (mongoose.connection.readyState === 1) {
    if (mongoose.connection.name === targetDbName) {
      isConnected = true;
      return mongoose.connection;
    }
    // If active connection has a different or unintended database name, reconnect
    await mongoose.disconnect();
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: targetDbName,
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    if (config.nodeEnv !== 'test') {
      console.warn('[MongoDB] Continuing without crashing immediately; retry on request.');
    }
    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected successfully');
  }
};

const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

const getDBName = () => {
  return mongoose.connection && mongoose.connection.name ? mongoose.connection.name : null;
};

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus,
  getDBName,
  resolveDatabaseName
};
