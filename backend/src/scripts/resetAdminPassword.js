const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');

/**
 * Dedicated CLI command to safely reset an administrator's password
 * Reads credentials from configuration or CLI arguments without exposing plaintext values.
 */
const resetAdminPassword = async () => {
  console.log('====================================================');
  console.log('  Smart Mess - Administrator Password Reset Utility');
  console.log('====================================================');

  try {
    await connectDB();

    // Target email: CLI arg or .env
    const targetEmail = (process.argv[2] || config.adminInitial.email || 'admin@mess.local').toLowerCase().trim();
    // New password: CLI arg or .env
    const newPassword = process.argv[3] || config.adminInitial.password;

    if (!newPassword || newPassword.length < 8) {
      console.error('[Reset Error] New password must be at least 8 characters long.');
      console.error('Usage: npm run reset:admin [email] [newPassword]');
      console.error('Or set ADMIN_INITIAL_PASSWORD in backend/.env');
      await disconnectDB();
      process.exit(1);
    }

    const user = await User.findOne({ email: targetEmail }).select('+passwordHash');
    if (!user) {
      console.error(`[Reset Error] No user found with email '${targetEmail}'.`);
      await disconnectDB();
      process.exit(1);
    }

    if (user.role !== 'admin') {
      console.error(`[Reset Security Error] User '${targetEmail}' has role '${user.role}', not 'admin'. Password reset aborted.`);
      await disconnectDB();
      process.exit(1);
    }

    // Securely hash the password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.isActive = true;
    await user.save();

    console.log(`[Reset Success] Password for administrator '${user.email}' has been updated successfully.`);
    console.log(`  Account Status: Active`);
    console.log(`  Role:           ${user.role}`);
    console.log('====================================================');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`[Reset Error] Failed to reset administrator password: ${error.message}`);
    await disconnectDB();
    process.exit(1);
  }
};

if (require.main === module) {
  resetAdminPassword();
}

module.exports = resetAdminPassword;
