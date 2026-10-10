const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const Menu = require('../src/models/Menu');
const { setupTestDB } = require('./testSetup');

describe('Menu Management Integration Tests', () => {
  setupTestDB();

  let adminToken;
  let studentToken;

  beforeEach(async () => {
    // 1. Create an admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPassword123!', salt);
    await User.create({
      name: 'Mess Admin',
      email: 'admin@mess.local',
      passwordHash,
      role: 'admin'
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mess.local', password: 'AdminPassword123!' });
    adminToken = adminLogin.body.data.token;

    // 2. Create a student
    const studentReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student User',
        email: 'student@mess.local',
        password: 'Password123!'
      });
    studentToken = studentReg.body.data.token;
  });

  const sampleMenuPayload = {
    date: '2026-10-15',
    mealType: 'lunch',
    items: [
      { name: 'Paneer Butter Masala', category: 'curry', isVeg: true },
      { name: 'Jeera Rice', category: 'main', isVeg: true },
      { name: 'Gulab Jamun', category: 'dessert', isVeg: true }
    ],
    notes: 'Special festival lunch'
  };

  describe('Create / Update Menu (POST /api/menu)', () => {
    it('should allow admin to create a menu entry and return HTTP 201', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleMenuPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe(sampleMenuPayload.date);
      expect(res.body.data.mealType).toBe(sampleMenuPayload.mealType);
      expect(res.body.data.items.length).toBe(3);
    });

    it('should reject student from creating menu with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(sampleMenuPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should update existing menu entry for same date and mealType without creating duplicates', async () => {
      await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleMenuPayload);

      const updatedPayload = {
        ...sampleMenuPayload,
        items: [{ name: 'Rajma Chawal', category: 'main', isVeg: true }]
      };

      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.items[0].name).toBe('Rajma Chawal');

      const totalMenus = await Menu.countDocuments({
        date: sampleMenuPayload.date,
        mealType: sampleMenuPayload.mealType
      });
      expect(totalMenus).toBe(1);
    });
  });

  describe('Get Menus (GET /api/menu/daily & GET /api/menu/weekly)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleMenuPayload);
    });

    it('should allow authenticated student to get daily menu', async () => {
      const res = await request(app)
        .get(`/api/menu/daily?date=${sampleMenuPayload.date}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.meals.lunch).toBeDefined();
      expect(res.body.data.meals.lunch.items[0].name).toBe('Paneer Butter Masala');
      expect(res.body.data.meals.breakfast).toBeNull();
    });

    it('should return weekly 7-day grid', async () => {
      const res = await request(app)
        .get('/api/menu/weekly?startDate=2026-10-12')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.days.length).toBe(7);
      expect(res.body.data.startDate).toBe('2026-10-12');
    });
  });

  describe('Delete Menu (DELETE /api/menu/:id)', () => {
    it('should allow admin to delete a menu entry', async () => {
      const createRes = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleMenuPayload);

      const menuId = createRes.body.data._id;

      const deleteRes = await request(app)
        .delete(`/api/menu/${menuId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const check = await Menu.findById(menuId);
      expect(check).toBeNull();
    });
  });
});
