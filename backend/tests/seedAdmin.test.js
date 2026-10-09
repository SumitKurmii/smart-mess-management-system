const User = require('../src/models/User');
const seedInitialAdmin = require('../src/scripts/seedAdmin');
const { setupTestDB } = require('./testSetup');

describe('Initial Administrator Provisioning Script (seedAdmin)', () => {
  setupTestDB();

  it('should provision a new administrator account when none exists', async () => {
    const adminUser = await seedInitialAdmin(null, false);

    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe('admin');
    expect(adminUser.email).toBe('admin@mess.local');

    // Confirm stored in MongoDB
    const foundInDb = await User.findOne({ email: 'admin@mess.local' });
    expect(foundInDb).toBeDefined();
    expect(foundInDb.role).toBe('admin');
  });

  it('should be idempotent and not overwrite an existing admin on second run', async () => {
    // First run creates admin
    await seedInitialAdmin(null, false);

    // Second run should return existing record without throwing error
    const secondResult = await seedInitialAdmin(null, false);
    expect(secondResult).toBeDefined();
    expect(secondResult.email).toBe('admin@mess.local');

    const totalAdmins = await User.countDocuments({ role: 'admin' });
    expect(totalAdmins).toBe(1);
  });
});
