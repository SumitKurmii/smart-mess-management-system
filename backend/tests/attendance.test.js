const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const MealBooking = require('../src/models/MealBooking');
const Attendance = require('../src/models/Attendance');
const SystemRule = require('../src/models/SystemRule');
const { setupTestDB } = require('./testSetup');

describe('Meal Attendance and Check-in Integration Tests', () => {
  setupTestDB();

  let student1Token;
  let student1User;
  let student2Token;
  let student2User;
  let adminToken;
  let adminUser;

  // Meal test configuration: Lunch on 2026-11-20 (Service Window: 12:30 to 14:30 IST)
  // In UTC: 12:30 IST = 07:00:00 UTC; 14:30 IST = 09:00:00 UTC
  const targetDate = '2026-11-20';
  const timeBeforeWindow = '2026-11-20T06:59:00.000Z'; // 12:29 IST (too early)
  const timeInsideWindow = '2026-11-20T07:30:00.000Z'; // 13:00 IST (active service)
  const timeAfterWindow = '2026-11-20T09:01:00.000Z';  // 14:31 IST (too late)

  beforeEach(async () => {
    // 1. Create Student 1
    const s1Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Aarav Patel',
        email: 'aarav@mess.local',
        password: 'Password123!',
        hostelRoom: 'B-201'
      });
    student1Token = s1Res.body.data.token;
    student1User = s1Res.body.data.user;

    // 2. Create Student 2
    const s2Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Diya Sharma',
        email: 'diya@mess.local',
        password: 'Password123!',
        hostelRoom: 'B-202'
      });
    student2Token = s2Res.body.data.token;
    student2User = s2Res.body.data.user;

    // 3. Create Admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPass123!', salt);
    adminUser = await User.create({
      name: 'Mess Superintendent',
      email: 'superintendent@mess.local',
      passwordHash,
      role: 'admin'
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superintendent@mess.local', password: 'AdminPass123!' });
    adminToken = adminLogin.body.data.token;
  });

  describe('Student Check-in (POST /api/attendance/check-in)', () => {
    it('should allow valid student check-in within permitted meal service window', async () => {
      // Pre-book lunch
      await MealBooking.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        status: 'booked'
      });

      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${student1Token}`)
        .set('x-test-current-time', timeInsideWindow)
        .send({
          date: targetDate,
          mealType: 'lunch'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mealType).toBe('lunch');
      expect(res.body.data.date).toBe(targetDate);
      expect(res.body.data.status).toBe('present');
      expect(res.body.data.verificationMethod).toBe('self_service');
      expect(res.body.data.recordedBy.toString()).toBe(student1User.id);
      expect(res.body.data.auditLog).toHaveLength(1);
      expect(res.body.data.auditLog[0].action).toBe('created');
    });

    it('should reject check-in attempt before the meal service window begins (too early)', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${student1Token}`)
        .set('x-test-current-time', timeBeforeWindow)
        .send({
          date: targetDate,
          mealType: 'lunch'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not started yet');
      expect(res.body.errors.reason).toBe('too_early');
    });

    it('should reject check-in attempt after the meal service window has closed (too late)', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${student1Token}`)
        .set('x-test-current-time', timeAfterWindow)
        .send({
          date: targetDate,
          mealType: 'lunch'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('has closed');
      expect(res.body.errors.reason).toBe('too_late');
    });

    it('should prevent duplicate check-in attempts and return HTTP 409 Conflict', async () => {
      // 1. Initial check-in
      await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${student1Token}`)
        .set('x-test-current-time', timeInsideWindow)
        .send({ date: targetDate, mealType: 'lunch' });

      // 2. Duplicate attempt
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${student1Token}`)
        .set('x-test-current-time', timeInsideWindow)
        .send({ date: targetDate, mealType: 'lunch' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already been recorded');

      // Database should contain exactly 1 record
      const count = await Attendance.countDocuments({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch'
      });
      expect(count).toBe(1);
    });

    it('should prevent student from checking in on behalf of another user', async () => {
      // Student 1 tries to supply Student 2's ID in payload
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${student1Token}`)
        .set('x-test-current-time', timeInsideWindow)
        .send({
          date: targetDate,
          mealType: 'lunch',
          userId: student2User.id, // malicious field injection
          studentId: student2User.id
        });

      expect(res.status).toBe(201);
      // Record MUST be bound to authenticated Student 1, never Student 2
      expect(res.body.data.user.toString()).toBe(student1User.id);

      const student2Record = await Attendance.findOne({
        user: student2User.id,
        date: targetDate,
        mealType: 'lunch'
      });
      expect(student2Record).toBeNull();
    });

    it('should reject student check-in if student explicitly marked meal as skipped', async () => {
      // Pre-book as skipped
      await MealBooking.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        status: 'skipped'
      });

      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${student1Token}`)
        .set('x-test-current-time', timeInsideWindow)
        .send({ date: targetDate, mealType: 'lunch' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('marked this meal as skipped');
    });
  });

  describe('Student Attendance History (GET /api/attendance/my)', () => {
    it('should return student own attendance history with pagination metadata', async () => {
      // Create two attendances for student 1
      await Attendance.create({
        user: student1User.id,
        date: '2026-11-19',
        mealType: 'dinner',
        checkInTime: new Date(),
        verificationMethod: 'self_service',
        status: 'present',
        recordedBy: student1User.id
      });
      await Attendance.create({
        user: student1User.id,
        date: '2026-11-20',
        mealType: 'lunch',
        checkInTime: new Date(),
        verificationMethod: 'self_service',
        status: 'present',
        recordedBy: student1User.id
      });
      // And one for student 2
      await Attendance.create({
        user: student2User.id,
        date: '2026-11-20',
        mealType: 'lunch',
        checkInTime: new Date(),
        verificationMethod: 'self_service',
        status: 'present',
        recordedBy: student2User.id
      });

      const res = await request(app)
        .get('/api/attendance/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
    });
  });

  describe('Administrator Operations & Permissions', () => {
    it('should reject unauthenticated or student requests to admin endpoints with 401/403', async () => {
      // Student attempting to record attendance
      const recordRes = await request(app)
        .post('/api/attendance/admin/record')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ studentId: student2User.id, date: targetDate, mealType: 'lunch' });
      expect(recordRes.status).toBe(403);

      // Student attempting to view analytics
      const analyticsRes = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${student1Token}`);
      expect(analyticsRes.status).toBe(403);

      // Student attempting to view admin list
      const listRes = await request(app)
        .get(`/api/attendance/admin/list?date=${targetDate}`)
        .set('Authorization', `Bearer ${student1Token}`);
      expect(listRes.status).toBe(403);
    });

    it('should allow administrator to manually record attendance for any student', async () => {
      const res = await request(app)
        .post('/api/attendance/admin/record')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student2User.id,
          date: targetDate,
          mealType: 'lunch',
          notes: 'Student forgot phone; manually verified'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.toString()).toBe(student2User.id);
      expect(res.body.data.verificationMethod).toBe('admin_manual');
      expect(res.body.data.recordedBy.toString()).toBe(adminUser._id.toString());
      expect(res.body.data.notes).toBe('Student forgot phone; manually verified');
      expect(res.body.data.auditLog[0].details).toContain('Mess Superintendent');
    });

    it('should allow administrator to correct an attendance record with full audit trail', async () => {
      // 1. Create attendance record
      const att = await Attendance.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        checkInTime: new Date(),
        verificationMethod: 'self_service',
        status: 'present',
        recordedBy: student1User.id
      });

      // 2. Admin corrects record to 'cancelled'
      const res = await request(app)
        .put(`/api/attendance/admin/${att._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'cancelled',
          notes: 'Accidental check-in; student did not dine'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data.updatedBy.toString()).toBe(adminUser._id.toString());
      expect(res.body.data.auditLog).toHaveLength(1);
      expect(res.body.data.auditLog[0].action).toBe('correction');
      expect(res.body.data.auditLog[0].details).toContain('present');
      expect(res.body.data.auditLog[0].details).toContain('cancelled');
    });
  });

  describe('Expected vs Actual Headcount Analytics', () => {
    it('should compute exact expected, actual, difference, and rate when actual matches expected', async () => {
      // 2 students pre-book lunch
      await MealBooking.create({ user: student1User.id, date: targetDate, mealType: 'lunch', status: 'booked' });
      await MealBooking.create({ user: student2User.id, date: targetDate, mealType: 'lunch', status: 'booked' });

      // Both students check in
      await Attendance.create({ user: student1User.id, date: targetDate, mealType: 'lunch', recordedBy: student1User.id });
      await Attendance.create({ user: student2User.id, date: targetDate, mealType: 'lunch', recordedBy: student2User.id });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.expectedDiners).toBe(2);
      expect(lunch.actualDiners).toBe(2);
      expect(lunch.difference).toBe(0);
      expect(lunch.attendanceRate).toBe(100.0);
      expect(lunch.isRateAvailable).toBe(true);
    });

    it('should handle actual attendance exceeding expected attendance (walk-in diners)', async () => {
      // 1 student booked
      await MealBooking.create({ user: student1User.id, date: targetDate, mealType: 'lunch', status: 'booked' });

      // 2 students attend (student 1 booked + student 2 walk-in)
      await Attendance.create({ user: student1User.id, date: targetDate, mealType: 'lunch', recordedBy: student1User.id });
      await Attendance.create({ user: student2User.id, date: targetDate, mealType: 'lunch', recordedBy: student2User.id });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.expectedDiners).toBe(1);
      expect(lunch.actualDiners).toBe(2);
      expect(lunch.difference).toBe(1); // +1
      expect(lunch.attendanceRate).toBe(200.0);
      expect(lunch.isRateAvailable).toBe(true);
    });

    it('should handle actual attendance falling below expected attendance (no-shows after window)', async () => {
      // 2 students booked
      await MealBooking.create({ user: student1User.id, date: targetDate, mealType: 'lunch', status: 'booked' });
      await MealBooking.create({ user: student2User.id, date: targetDate, mealType: 'lunch', status: 'booked' });

      // Only 1 student attends
      await Attendance.create({ user: student1User.id, date: targetDate, mealType: 'lunch', recordedBy: student1User.id });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-test-current-time', timeAfterWindow);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.expectedDiners).toBe(2);
      expect(lunch.actualDiners).toBe(1);
      expect(lunch.difference).toBe(-1); // -1
      expect(lunch.differenceType).toBe('no_shows');
      expect(lunch.differenceLabel).toBe('-1 (No-shows)');
      expect(lunch.noShowCount).toBe(1);
      expect(lunch.pendingCount).toBe(0);
      expect(lunch.attendanceRate).toBe(50.0);
      expect(lunch.isRateAvailable).toBe(true);
    });

    it('should report attendance rate as null/unavailable when expected diners count is 0', async () => {
      // 0 bookings for breakfast
      // 1 walk-in attends breakfast
      await Attendance.create({ user: student1User.id, date: targetDate, mealType: 'breakfast', recordedBy: student1User.id });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const breakfast = res.body.data.sessions.breakfast;
      expect(breakfast.expectedDiners).toBe(0);
      expect(breakfast.actualDiners).toBe(1);
      expect(breakfast.difference).toBe(1);
      expect(breakfast.attendanceRate).toBeNull();
      expect(breakfast.isRateAvailable).toBe(false);
      expect(breakfast.statusLabel).toContain('Walk-ins Only');
    });

    it('should distinguish an actual rate of 0.0% from unavailable when expected diners > 0', async () => {
      // 2 students booked dinner, but 0 attend
      await MealBooking.create({ user: student1User.id, date: targetDate, mealType: 'dinner', status: 'booked' });
      await MealBooking.create({ user: student2User.id, date: targetDate, mealType: 'dinner', status: 'booked' });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-test-current-time', '2026-11-20T16:01:00.000Z'); // After dinner window (21:31 IST)

      expect(res.status).toBe(200);
      const dinner = res.body.data.sessions.dinner;
      expect(dinner.expectedDiners).toBe(2);
      expect(dinner.actualDiners).toBe(0);
      expect(dinner.difference).toBe(-2);
      expect(dinner.differenceType).toBe('no_shows');
      expect(dinner.differenceLabel).toBe('-2 (No-shows)');
      expect(dinner.attendanceRate).toBe(0.0);
      expect(dinner.isRateAvailable).toBe(true);
      expect(dinner.statusLabel).toBe('0%');
    });
  });

  describe('Service Window State Boundaries & Status Interpretation', () => {
    // Lunch service window: 12:30 to 14:30 IST (07:00:00 to 09:00:00 UTC) on 2026-11-20
    const beforeStart = '2026-11-20T06:59:59.000Z'; // 12:29:59 IST (1 second before window)
    const exactStart = '2026-11-20T07:00:00.000Z';  // 12:30:00 IST (exact start boundary)
    const midWindow = '2026-11-20T08:00:00.000Z';   // 13:30:00 IST (during window)
    const exactEnd = '2026-11-20T09:00:00.000Z';    // 14:30:00 IST (exact end boundary)
    const afterEnd = '2026-11-20T09:00:01.000Z';    // 14:30:01 IST (1 second after window)

    beforeEach(async () => {
      // 2 students pre-book lunch
      await MealBooking.create({ user: student1User.id, date: targetDate, mealType: 'lunch', status: 'booked' });
      await MealBooking.create({ user: student2User.id, date: targetDate, mealType: 'lunch', status: 'booked' });
    });

    it('1. BEFORE WINDOW: should label as Upcoming and Attendance pending (NEVER as no-shows)', async () => {
      // 0 students have attended yet
      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-test-current-time', beforeStart);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.windowStatus).toBe('upcoming');
      expect(lunch.windowStatusLabel).toBe('Upcoming');
      expect(lunch.expectedDiners).toBe(2);
      expect(lunch.actualDiners).toBe(0);
      expect(lunch.difference).toBe(-2);
      expect(lunch.differenceType).toBe('pending');
      expect(lunch.differenceLabel).toBe('-2 (Attendance pending)');
      expect(lunch.pendingCount).toBe(2);
      expect(lunch.noShowCount).toBe(0); // MUST NOT be classified as no-shows
    });

    it('2. EXACT START BOUNDARY: should label as In progress and Attendance pending', async () => {
      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-test-current-time', exactStart);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.windowStatus).toBe('in_progress');
      expect(lunch.windowStatusLabel).toBe('In progress');
      expect(lunch.differenceType).toBe('pending');
      expect(lunch.differenceLabel).toBe('-2 (Attendance pending)');
      expect(lunch.noShowCount).toBe(0);
    });

    it('3. DURING WINDOW: should label as In progress and Attendance pending for unarrived diners', async () => {
      // 1 student has checked in
      await Attendance.create({ user: student1User.id, date: targetDate, mealType: 'lunch', recordedBy: student1User.id });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-test-current-time', midWindow);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.windowStatus).toBe('in_progress');
      expect(lunch.windowStatusLabel).toBe('In progress');
      expect(lunch.expectedDiners).toBe(2);
      expect(lunch.actualDiners).toBe(1);
      expect(lunch.difference).toBe(-1);
      expect(lunch.differenceType).toBe('pending');
      expect(lunch.differenceLabel).toBe('-1 (Attendance pending)');
      expect(lunch.pendingCount).toBe(1);
      expect(lunch.noShowCount).toBe(0);
    });

    it('4. EXACT END BOUNDARY: should remain In progress until the service instant completes', async () => {
      // 1 student has checked in
      await Attendance.create({ user: student1User.id, date: targetDate, mealType: 'lunch', recordedBy: student1User.id });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-test-current-time', exactEnd);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.windowStatus).toBe('in_progress');
      expect(lunch.windowStatusLabel).toBe('In progress');
      expect(lunch.differenceType).toBe('pending');
      expect(lunch.differenceLabel).toBe('-1 (Attendance pending)');
    });

    it('5. AFTER WINDOW: should classify missing expected diners as finalized No-shows', async () => {
      // 1 student checked in, 1 student was absent
      await Attendance.create({ user: student1User.id, date: targetDate, mealType: 'lunch', recordedBy: student1User.id });

      const res = await request(app)
        .get(`/api/attendance/admin/analytics?date=${targetDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-test-current-time', afterEnd);

      expect(res.status).toBe(200);
      const lunch = res.body.data.sessions.lunch;
      expect(lunch.windowStatus).toBe('completed');
      expect(lunch.windowStatusLabel).toBe('Completed');
      expect(lunch.expectedDiners).toBe(2);
      expect(lunch.actualDiners).toBe(1);
      expect(lunch.difference).toBe(-1);
      expect(lunch.differenceType).toBe('no_shows');
      expect(lunch.differenceLabel).toBe('-1 (No-shows)');
      expect(lunch.noShowCount).toBe(1);
      expect(lunch.pendingCount).toBe(0);
    });
  });
});
