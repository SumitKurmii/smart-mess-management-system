const request = require('supertest');
const app = require('../src/app');

describe('Health Check Endpoint (GET /api/health)', () => {
  it('should return system health metadata and HTTP 200', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('operationalDate');
    expect(res.body.data).toHaveProperty('timezone', 'Asia/Kolkata');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
  });

  it('should return 404 for non-existent API routes', async () => {
    const res = await request(app).get('/api/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
