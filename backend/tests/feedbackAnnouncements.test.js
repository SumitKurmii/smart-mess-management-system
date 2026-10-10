const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');
const Menu = require('../src/models/Menu');
const MealRating = require('../src/models/MealRating');
const Complaint = require('../src/models/Complaint');
const MessRequest = require('../src/models/MessRequest');
const Announcement = require('../src/models/Announcement');
const { setupTestDB } = require('./testSetup');

describe('Feedback, Complaints, Requests & Announcements Integration Tests', () => {
  setupTestDB();

  let student1Token;
  let student1User;
  let student2Token;
  let student2User;
  let adminToken;
  let adminUser;

  const targetDate = '2026-11-20';

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

    // 3. Create Administrator
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPass123!', salt);
    adminUser = await User.create({
      name: 'Mess Superintendent',
      email: 'admin@mess.local',
      passwordHash,
      role: 'admin'
    });

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@mess.local',
        password: 'AdminPass123!'
      });
    adminToken = adminLoginRes.body.data.token;

    // 4. Create Menu item for targetDate lunch
    await Menu.create({
      date: targetDate,
      mealType: 'lunch',
      items: [
        { name: 'Paneer Butter Masala', category: 'curry', isVeg: true },
        { name: 'Jeera Rice', category: 'main', isVeg: true },
        { name: 'Roti', category: 'side', isVeg: true },
        { name: 'Dal Tadka', category: 'curry', isVeg: true }
      ],
      notes: 'Special Friday Menu'
    });
  });

  // ==========================================
  // SECTION 1: MEAL RATINGS
  // ==========================================
  describe('Meal Ratings', () => {
    it('rejects rating submission if student has not attended the meal', async () => {
      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'lunch',
          rating: 4,
          comment: 'Looked tasty but I did not check in'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Attendance verification required/i);
    });

    it('allows rating submission for verified attended meal and associates menu', async () => {
      // Record verified attendance for Student 1
      const attendance = await Attendance.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        checkInTime: new Date('2026-11-20T07:30:00.000Z'),
        status: 'present',
        verificationMethod: 'self_service',
        recordedBy: student1User.id
      });

      const res = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'lunch',
          rating: 5,
          comment: 'Paneer was fantastic!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.comment).toBe('Paneer was fantastic!');
      expect(res.body.data.attendance).toBe(attendance._id.toString());
      expect(res.body.data.menu).toBeDefined();

      // Verify in DB
      const stored = await MealRating.findOne({ user: student1User.id, date: targetDate, mealType: 'lunch' });
      expect(stored).not.toBeNull();
      expect(stored.rating).toBe(5);
    });

    it('rejects invalid rating scores outside 1-5 or invalid meal types', async () => {
      await Attendance.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        checkInTime: new Date(),
        status: 'present',
        verificationMethod: 'self_service',
        recordedBy: student1User.id
      });

      const resHigh = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'lunch',
          rating: 6
        });
      expect(resHigh.status).toBe(400);

      const resLow = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'lunch',
          rating: 0
        });
      expect(resLow.status).toBe(400);

      const resInvalidMeal = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'midnight_snack',
          rating: 4
        });
      expect(resInvalidMeal.status).toBe(400);
    });

    it('prevents duplicate ratings for the same student, date, and mealType', async () => {
      await Attendance.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        checkInTime: new Date(),
        status: 'present',
        verificationMethod: 'self_service',
        recordedBy: student1User.id
      });

      // First rating
      const firstRes = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'lunch',
          rating: 4,
          comment: 'First review'
        });
      expect(firstRes.status).toBe(201);

      // Duplicate rating
      const dupRes = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'lunch',
          rating: 5,
          comment: 'Trying to vote again'
        });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.message).toMatch(/Duplicate rating/i);
    });

    it('allows student to fetch their own ratings and eligible unrated meals', async () => {
      await Attendance.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        checkInTime: new Date(),
        status: 'present',
        verificationMethod: 'self_service',
        recordedBy: student1User.id
      });

      await Attendance.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'dinner',
        checkInTime: new Date(),
        status: 'present',
        verificationMethod: 'self_service',
        recordedBy: student1User.id
      });

      // Submit rating for lunch only
      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          date: targetDate,
          mealType: 'lunch',
          rating: 4
        });

      // Check eligible unrated: dinner should appear, lunch should not
      const eligibleRes = await request(app)
        .get('/api/ratings/eligible')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(eligibleRes.status).toBe(200);
      expect(eligibleRes.body.data.length).toBe(1);
      expect(eligibleRes.body.data[0].mealType).toBe('dinner');

      // Check my ratings: lunch should appear
      const myRatingsRes = await request(app)
        .get('/api/ratings/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(myRatingsRes.status).toBe(200);
      expect(myRatingsRes.body.data.ratings.length).toBe(1);
      expect(myRatingsRes.body.data.ratings[0].mealType).toBe('lunch');
    });

    it('enforces admin-only access for rating analytics and returns correct stats', async () => {
      // Student cannot access admin ratings
      const forbidRes = await request(app)
        .get('/api/ratings/admin')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(forbidRes.status).toBe(403);

      // Set up attendance and ratings for Student 1 and Student 2
      await Attendance.create({
        user: student1User.id,
        date: targetDate,
        mealType: 'lunch',
        checkInTime: new Date(),
        status: 'present',
        verificationMethod: 'self_service',
        recordedBy: student1User.id
      });
      await Attendance.create({
        user: student2User.id,
        date: targetDate,
        mealType: 'lunch',
        checkInTime: new Date(),
        status: 'present',
        verificationMethod: 'self_service',
        recordedBy: student2User.id
      });

      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ date: targetDate, mealType: 'lunch', rating: 4 });

      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ date: targetDate, mealType: 'lunch', rating: 2 });

      // Admin accesses analytics
      const adminRes = await request(app)
        .get('/api/ratings/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.ratings.length).toBe(2);
      expect(adminRes.body.data.stats.totalRatings).toBe(2);
      expect(adminRes.body.data.stats.averageRating).toBe(3.0);
      expect(adminRes.body.data.stats.distribution[4]).toBe(1);
      expect(adminRes.body.data.stats.distribution[2]).toBe(1);
    });
  });

  // ==========================================
  // SECTION 2: COMPLAINTS & STRICT ISOLATION
  // ==========================================
  describe('Complaints and Strict Student Isolation', () => {
    it('allows student to submit complaint with supported category and optional meal info', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Hygiene',
          description: 'Dining table 4 was sticky and not sanitized after dinner.',
          mealDate: targetDate,
          mealType: 'dinner'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Hygiene');
      expect(res.body.data.status).toBe('Open');
      expect(res.body.data.statusHistory.length).toBe(1);
      expect(res.body.data.statusHistory[0].status).toBe('Open');
    });

    it('rejects complaint submission with invalid category or short description', async () => {
      const resInvalidCat = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Wi-Fi Problem',
          description: 'Internet is slow in mess hall'
        });
      expect(resInvalidCat.status).toBe(400);

      const resShortDesc = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Food Quality',
          description: 'Bad'
        });
      expect(resShortDesc.status).toBe(400);
    });

    it('enforces strict student isolation: student only sees their own complaints', async () => {
      // Student 1 submits
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Quantity',
          description: 'Rice ran out early during lunch today.'
        });

      // Student 2 submits
      await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          category: 'Service',
          description: 'Counter queue was moving too slowly.'
        });

      // Student 1 fetches my complaints
      const s1Res = await request(app)
        .get('/api/complaints/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(s1Res.status).toBe(200);
      expect(s1Res.body.data.complaints.length).toBe(1);
      expect(s1Res.body.data.complaints[0].category).toBe('Quantity');
      expect(s1Res.body.data.complaints[0].user.toString()).toBe(student1User.id);

      // Student 2 fetches my complaints
      const s2Res = await request(app)
        .get('/api/complaints/my')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(s2Res.status).toBe(200);
      expect(s2Res.body.data.complaints.length).toBe(1);
      expect(s2Res.body.data.complaints[0].category).toBe('Service');
      expect(s2Res.body.data.complaints[0].user.toString()).toBe(student2User.id);
    });

    it('allows administrator to view all complaints and update status with response and history', async () => {
      // Student submits
      const submitRes = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Food Quality',
          description: 'Soup was overly salted today.'
        });
      const complaintId = submitRes.body.data._id;

      // Student cannot access admin list or update
      const forbidGet = await request(app)
        .get('/api/complaints/admin')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(forbidGet.status).toBe(403);

      const forbidPut = await request(app)
        .put(`/api/complaints/admin/${complaintId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ status: 'Resolved' });
      expect(forbidPut.status).toBe(403);

      // Admin views all complaints
      const adminListRes = await request(app)
        .get('/api/complaints/admin')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminListRes.status).toBe(200);
      expect(adminListRes.body.data.complaints.length).toBe(1);
      expect(adminListRes.body.data.counts.open).toBe(1);

      // Admin updates status to 'In Progress'
      const updateRes1 = await request(app)
        .put(`/api/complaints/admin/${complaintId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'In Progress',
          adminResponse: 'We have notified the head chef.'
        });
      expect(updateRes1.status).toBe(200);
      expect(updateRes1.body.data.status).toBe('In Progress');
      expect(updateRes1.body.data.statusHistory.length).toBe(2);

      // Admin resolves complaint
      const updateRes2 = await request(app)
        .put(`/api/complaints/admin/${complaintId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Resolved',
          adminResponse: 'Chef calibrated salt measurements. Issue resolved.'
        });
      expect(updateRes2.status).toBe(200);
      expect(updateRes2.body.data.status).toBe('Resolved');
      expect(updateRes2.body.data.resolvedBy).toBeDefined();
      expect(updateRes2.body.data.statusHistory.length).toBe(3);

      // Student sees updated complaint with admin response
      const studentViewRes = await request(app)
        .get('/api/complaints/my')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(studentViewRes.body.data.complaints[0].status).toBe('Resolved');
      expect(studentViewRes.body.data.complaints[0].adminResponse).toMatch(/Issue resolved/i);
    });
  });

  // ==========================================
  // SECTION 3: MESS REQUESTS
  // ==========================================
  describe('Student Requests', () => {
    it('allows student to submit requests for Maintenance, Facilities, or Other', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Facilities',
          title: 'Water dispenser tap leaking',
          description: 'The cold water tap on the second dispenser is dripping continuously.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('Facilities');
      expect(res.body.data.status).toBe('Pending');
      expect(res.body.data.statusHistory.length).toBe(1);
    });

    it('enforces student isolation on requests', async () => {
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Maintenance',
          title: 'Exhaust fan noise',
          description: 'North side exhaust fan vibrates loudly.'
        });

      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          category: 'Other',
          title: 'Handwash refill',
          description: 'Soap dispenser near washbasin 2 is empty.'
        });

      const s1Res = await request(app)
        .get('/api/requests/my')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(s1Res.body.data.requests.length).toBe(1);
      expect(s1Res.body.data.requests[0].title).toBe('Exhaust fan noise');

      const s2Res = await request(app)
        .get('/api/requests/my')
        .set('Authorization', `Bearer ${student2Token}`);
      expect(s2Res.body.data.requests.length).toBe(1);
      expect(s2Res.body.data.requests[0].title).toBe('Handwash refill');
    });

    it('allows administrator to view all requests and update status with response', async () => {
      const submitRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          category: 'Maintenance',
          title: 'Broken chair at Table 12',
          description: 'One chair leg is fractured and wobbles dangerously.'
        });
      const reqId = submitRes.body.data._id;

      // Student cannot access admin endpoints
      const forbidAdmin = await request(app)
        .get('/api/requests/admin')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(forbidAdmin.status).toBe(403);

      // Admin updates status
      const adminUpdateRes = await request(app)
        .put(`/api/requests/admin/${reqId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'In Progress',
          adminResponse: 'Carpentry staff dispatched.'
        });

      expect(adminUpdateRes.status).toBe(200);
      expect(adminUpdateRes.body.data.status).toBe('In Progress');
      expect(adminUpdateRes.body.data.adminResponse).toBe('Carpentry staff dispatched.');
    });
  });

  // ==========================================
  // SECTION 4: ANNOUNCEMENTS
  // ==========================================
  describe('Announcements', () => {
    it('allows students to view only published announcements', async () => {
      // Create published announcement
      await Announcement.create({
        title: 'Special Diwali Dinner',
        content: 'Join us for a grand festive dinner this Saturday evening from 19:30 onwards.',
        category: 'Special Event',
        status: 'published',
        pinned: true,
        createdBy: adminUser._id
      });

      // Create draft announcement
      await Announcement.create({
        title: 'Upcoming Kitchen Maintenance Draft',
        content: 'Internal draft not ready for public viewing.',
        category: 'General',
        status: 'draft',
        createdBy: adminUser._id
      });

      // Student views announcements
      const res = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.announcements.length).toBe(1);
      expect(res.body.data.announcements[0].title).toBe('Special Diwali Diwali'.replace('Diwali Diwali', 'Diwali Dinner'));
      expect(res.body.data.announcements[0].pinned).toBe(true);
    });

    it('forbids students from admin announcement management endpoints', async () => {
      const forbidCreate = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          title: 'Unauthorized Announcement',
          content: 'Students should not be allowed to broadcast announcements.'
        });
      expect(forbidCreate.status).toBe(403);

      const forbidList = await request(app)
        .get('/api/announcements/admin')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(forbidList.status).toBe(403);
    });

    it('allows administrator to create, update, and manage announcements', async () => {
      // 1. Admin creates announcement
      const createRes = await request(app)
        .post('/api/announcements/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Breakfast Timing Shift Next Week',
          content: 'Breakfast will start at 07:00 AM instead of 07:30 AM starting Monday.',
          category: 'Timing',
          status: 'published',
          pinned: false
        });

      expect(createRes.status).toBe(201);
      const annId = createRes.body.data._id;

      // 2. Admin updates announcement to pinned
      const updateRes = await request(app)
        .put(`/api/announcements/admin/${annId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pinned: true,
          title: 'IMPORTANT: Breakfast Timing Shift Next Week'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.pinned).toBe(true);
      expect(updateRes.body.data.title).toMatch(/^IMPORTANT:/);

      // 3. Admin views all announcements
      const adminListRes = await request(app)
        .get('/api/announcements/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminListRes.status).toBe(200);
      expect(adminListRes.body.data.announcements.length).toBe(1);

      // 4. Admin deletes/archives announcement
      const deleteRes = await request(app)
        .delete(`/api/announcements/admin/${annId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      const remaining = await Announcement.findById(annId);
      expect(remaining).toBeNull();
    });
  });
});
