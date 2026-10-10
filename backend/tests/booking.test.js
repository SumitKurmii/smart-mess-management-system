const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const MealBooking = require('../src/models/MealBooking');
const { setupTestDB } = require('./testSetup');

describe('Meal Booking & Intention Integration Tests', () => {
  setupTestDB();

  let studentToken;
  let adminToken;
  let studentUser;

  beforeEach(async () => {
    // 1. Create a student
    const studentReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Diner Student',
        email: 'diner@mess.local',
        password: 'Password123!',
        hostelRoom: 'C-101'
      });
    studentToken = studentReg.body.data.token;
    studentUser = studentReg.body.data.user;

    // 2. Create an admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPassword123!', salt);
    await User.create({
      name: 'Mess Manager',
      email: 'manager@mess.local',
      passwordHash,
      role: 'admin'
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@mess.local', password: 'AdminPassword123!' });
    adminToken = adminLogin.body.data.token;
  });

  describe('Single Meal Booking (POST /api/bookings)', () => {
    it('should allow student to book a future meal before cutoff', async () => {
      // Choose date far in the future
      const futureDate = '2026-11-25';

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          date: futureDate,
          mealType: 'lunch',
          status: 'booked'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('booked');
      expect(res.body.data.date).toBe(futureDate);
    });

    it('should reject booking a past meal with HTTP 400 and deadline message', async () => {
      // Past date
      const pastDate = '2026-09-01';

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          date: pastDate,
          mealType: 'lunch',
          status: 'booked'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Booking deadline passed');
    });

    it('should update preference from booked to skipped without creating duplicate records', async () => {
      const futureDate = '2026-11-25';

      // 1. Book meal
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ date: futureDate, mealType: 'dinner', status: 'booked' });

      // 2. Change preference to skipped
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ date: futureDate, mealType: 'dinner', status: 'skipped' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('skipped');

      const count = await MealBooking.countDocuments({
        user: studentUser.id,
        date: futureDate,
        mealType: 'dinner'
      });
      expect(count).toBe(1);
    });
  });

  describe('Bulk Weekly Booking (POST /api/bookings/bulk)', () => {
    it('should process bulk weekly meal intentions and enforce deadline checks per slot', async () => {
      const futureDate1 = '2026-11-20';
      const futureDate2 = '2026-11-21';
      const pastDate = '2026-09-10';

      const res = await request(app)
        .post('/api/bookings/bulk')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          bookings: [
            { date: futureDate1, mealType: 'breakfast', status: 'booked' },
            { date: futureDate1, mealType: 'lunch', status: 'booked' },
            { date: futureDate2, mealType: 'lunch', status: 'skipped' },
            { date: pastDate, mealType: 'dinner', status: 'booked' } // should be rejected
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(3);
      expect(res.body.data.rejectedCount).toBe(1);
    });
  });

  describe('Get My Bookings (GET /api/bookings/my)', () => {
    it('should return bookings and real-time cutoff status for the active week', async () => {
      const futureDate = '2026-11-25';
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ date: futureDate, mealType: 'lunch', status: 'booked' });

      const res = await request(app)
        .get(`/api/bookings/my?startDate=2026-11-23&endDate=2026-11-29`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookingMap).toBeDefined();
      expect(res.body.data.bookingMap[futureDate].lunch.status).toBe('booked');
      expect(res.body.data.cutoffStatus).toBeDefined();
    });
  });

  describe('Admin Headcount Aggregation (GET /api/bookings/headcount)', () => {
    const targetDate = '2026-11-28';

    beforeEach(async () => {
      // Student 1 books lunch
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ date: targetDate, mealType: 'lunch', status: 'booked' });
    });

    it('should aggregate expected diner count for admin', async () => {
      const res = await request(app)
        .get(`/api/bookings/headcount?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.headcount.lunch.booked).toBe(1);
      expect(res.body.data.headcount.lunch.skipped).toBe(0);
      expect(res.body.data.headcount.breakfast.booked).toBe(0);
    });

    it('should reject student from accessing headcount with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/bookings/headcount?date=${targetDate}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
