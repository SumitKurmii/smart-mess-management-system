const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const { setupTestDB } = require('./testSetup');

describe('Authentication & Authorization Integration Tests', () => {
  setupTestDB();

  const studentPayload = {
    name: 'Komal Sharma',
    email: 'student@mess.local',
    password: 'Password123!',
    hostelRoom: 'B-204',
    dietaryPreference: 'veg'
  };

  describe('Registration (POST /api/auth/register)', () => {
    it('should register a new student user and return HTTP 201 with secure cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(studentPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.name).toBe(studentPayload.name);
      expect(res.body.data.user.email).toBe(studentPayload.email);
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.startsWith('auth_token='))).toBe(true);
    });

    it('SECURITY REQUIREMENT: should unconditionally force student role even if client passes role: admin', async () => {
      const maliciousPayload = {
        name: 'Hacker User',
        email: 'malicious@mess.local',
        password: 'Password123!',
        role: 'admin' // Attempting privilege escalation
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(maliciousPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('student');

      // Verify in database that role was NOT stored as admin
      const storedUser = await User.findOne({ email: maliciousPayload.email });
      expect(storedUser).toBeDefined();
      expect(storedUser.role).toBe('student');

      // Verify this registered user cannot access admin-only endpoint
      const adminCheck = await request(app)
        .get('/api/auth/admin-only-test')
        .set('Authorization', `Bearer ${res.body.data.token}`);

      expect(adminCheck.status).toBe(403);
      expect(adminCheck.body.success).toBe(false);
      expect(adminCheck.body.message).toContain('Access forbidden');
    });

    it('should reject registration with duplicate email with HTTP 409 Conflict', async () => {
      await request(app).post('/api/auth/register').send(studentPayload);

      const res = await request(app)
        .post('/api/auth/register')
        .send(studentPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration if password is under 8 characters with HTTP 400', async () => {
      const invalidPayload = {
        ...studentPayload,
        email: 'shortpass@mess.local',
        password: 'short'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Login (POST /api/auth/login)', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(studentPayload);
    });

    it('should login with valid credentials and return HTTP 200 with auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: studentPayload.email,
          password: studentPayload.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(studentPayload.email);
      expect(res.body.data.token).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.startsWith('auth_token='))).toBe(true);
    });

    it('should reject invalid password with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: studentPayload.email,
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent user with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@mess.local',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Session Verification & RBAC (GET /api/auth/me & /api/auth/admin-only-test)', () => {
    let studentToken;
    let adminToken;

    beforeEach(async () => {
      // 1. Create a student account
      const studentRes = await request(app).post('/api/auth/register').send(studentPayload);
      studentToken = studentRes.body.data.token;

      // 2. Directly provision an admin account in DB to test authorization
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('AdminPassword123!', salt);
      const adminUser = await User.create({
        name: 'Admin Test',
        email: 'admin.test@mess.local',
        passwordHash,
        role: 'admin',
        hostelRoom: 'OFFICE'
      });

      const adminLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin.test@mess.local', password: 'AdminPassword123!' });
      adminToken = adminLoginRes.body.data.token;
    });

    it('should return current user profile on /api/auth/me using Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(studentPayload.email);
      expect(res.body.data.user.role).toBe('student');
    });

    it('should return 401 on /api/auth/me if unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject student from accessing admin-only route with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only-test')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access forbidden');
    });

    it('should allow admin to access admin-only route with HTTP 200 OK', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only-test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.confirmedRole).toBe('admin');
    });
  });

  describe('CSRF & Origin Protection on Cookie Sessions', () => {
    it('should reject state-changing request with cookie if Origin is untrusted', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', ['auth_token=fake_or_valid_cookie'])
        .set('Origin', 'http://malicious-website.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('CSRF validation failed');
    });

    it('should allow logout when Origin is trusted or no malicious origin present', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.startsWith('auth_token=;'))).toBe(true);
    });

    it('should allow state-changing request and CSRF validation from production Vercel origin', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', 'https://smart-mess-frontend-sumitkurmii.vercel.app');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['access-control-allow-origin']).toBe('https://smart-mess-frontend-sumitkurmii.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('CORS and Preflight Handling for Production & Development', () => {
    const prodOrigin = 'https://smart-mess-frontend-sumitkurmii.vercel.app';
    const disallowedOrigin = 'https://malicious-site.com';

    it('should handle preflight OPTIONS for /api/auth/login from production Vercel origin', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', prodOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,X-Smart-Mess-Client,Authorization');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(prodOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-headers']).toMatch(/Content-Type/i);
      expect(res.headers['access-control-allow-headers']).toMatch(/X-Smart-Mess-Client/i);
    });

    it('should handle preflight OPTIONS for /api/auth/me from production Vercel origin', async () => {
      const res = await request(app)
        .options('/api/auth/me')
        .set('Origin', prodOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'X-Smart-Mess-Client');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(prodOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
    });

    it('should allow credentialed GET request from production origin with explicit origin header', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', prodOrigin);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(prodOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('should not return Access-Control-Allow-Origin for preflight OPTIONS from disallowed origin', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', disallowedOrigin)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should not return Access-Control-Allow-Origin for GET request from disallowed origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', disallowedOrigin);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should support local development origin http://localhost:5173 with credentials', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
