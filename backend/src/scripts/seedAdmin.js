const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');

const seedInitialAdmin = async (customUri = null, shouldExit = true) => {
  console.log('====================================================');
  console.log('  Smart Mess - Initial Administrator Provisioning');
  console.log('====================================================');

  try {
    await connectDB(customUri);

    const { name, email, password } = config.adminInitial;

    if (!email || !password || password.length < 8) {
      console.error('[Seed Error] ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD (min 8 chars) must be configured in .env');
      if (shouldExit) process.exit(1);
      throw new Error('Missing admin credentials in configuration');
    }

    // Check if an admin account already exists
    const existingAdminByEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingAdminByEmail) {
      console.log(`[Seed Notice] User with email '${existingAdminByEmail.email}' already exists.`);
      if (existingAdminByEmail.role === 'admin') {
        console.log(`[Seed Notice] Account is already an administrator. No changes made.`);
      } else {
        console.log(`[Seed Notice] Account has role '${existingAdminByEmail.role}'. To preserve security, role was not altered.`);
      }
      if (shouldExit) {
        await disconnectDB();
        process.exit(0);
      }
      return existingAdminByEmail;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create the initial admin record
    const adminUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
      hostelRoom: 'ADMIN-OFFICE',
      dietaryPreference: 'veg',
      isActive: true
    });

    console.log(`[Seed Success] Initial administrator created successfully!`);
    console.log(`  Name:  ${adminUser.name}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role:  ${adminUser.role}`);
    console.log('====================================================');

    if (shouldExit) {
      await disconnectDB();
      process.exit(0);
    }
    return adminUser;
  } catch (error) {
    console.error(`[Seed Error] Failed to provision initial administrator: ${error.message}`);
    if (shouldExit) {
      await disconnectDB();
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedInitialAdmin();
}

module.exports = seedInitialAdmin;
