const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../src/config/env');
const { connectDB, disconnectDB, getDBName, resolveDatabaseName } = require('../src/config/db');

describe('Database Selection & Connection Configuration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('URI Database Name Resolution (resolveDatabaseName)', () => {
    it('should resolve smart_mess when URI specifies /smart_mess in path', () => {
      const uri = 'mongodb+srv://smart_mess_app:secret@cluster0.abcde.mongodb.net/smart_mess?retryWrites=true&w=majority';
      expect(resolveDatabaseName(uri)).toBe('smart_mess');
    });

    it('should resolve smart_mess when URI omits database path (Atlas default /?)', () => {
      const uri = 'mongodb+srv://smart_mess_app:secret@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority';
      expect(resolveDatabaseName(uri)).toBe('smart_mess');
    });

    it('should resolve smart_mess when local URI has no path or trailing slash', () => {
      expect(resolveDatabaseName('mongodb://127.0.0.1:27017')).toBe('smart_mess');
      expect(resolveDatabaseName('mongodb://127.0.0.1:27017/')).toBe('smart_mess');
    });

    it('should prevent unintended "test" database fallback and resolve to smart_mess', () => {
      const uri = 'mongodb+srv://smart_mess_app:secret@cluster0.abcde.mongodb.net/test?retryWrites=true&w=majority';
      expect(resolveDatabaseName(uri)).toBe('smart_mess');
    });

    it('should preserve explicitly defined custom non-test database names', () => {
      const uri = 'mongodb://127.0.0.1:27017/custom_workspace_db';
      expect(resolveDatabaseName(uri)).toBe('custom_workspace_db');
    });
  });

  describe('Effective Database Name on Active Mongoose Connection', () => {
    afterEach(async () => {
      await disconnectDB();
    });

    it('should establish connection with effective database name "smart_mess" when URI omits database', async () => {
      const baseUri = mongoServer.getUri(); // returns mongodb://127.0.0.1:<port>/
      const conn = await connectDB(baseUri);

      expect(conn.name).toBe('smart_mess');
      expect(mongoose.connection.name).toBe('smart_mess');
      expect(getDBName()).toBe('smart_mess');
    });

    it('should override unintended /test connection string and connect to "smart_mess"', async () => {
      const testUri = `${mongoServer.getUri()}test`;
      const conn = await connectDB(testUri);

      expect(conn.name).toBe('smart_mess');
      expect(mongoose.connection.name).toBe('smart_mess');
      expect(getDBName()).toBe('smart_mess');
    });

    it('should connect to "smart_mess" when URI explicitly contains /smart_mess', async () => {
      const smartMessUri = `${mongoServer.getUri()}smart_mess`;
      const conn = await connectDB(smartMessUri);

      expect(conn.name).toBe('smart_mess');
      expect(mongoose.connection.name).toBe('smart_mess');
      expect(getDBName()).toBe('smart_mess');
    });
  });

  describe('Environment Configuration Defaults', () => {
    it('should configure smart_mess as the default application database', () => {
      expect(config.dbName).toBe('smart_mess');
      expect(config.mongodbUri).toMatch(/\/smart_mess$/);
    });
  });
});
