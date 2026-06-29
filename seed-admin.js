// ─── seed-admin.js ────────────────────────────────────────────────────────────
// ONE-TIME SETUP SCRIPT — Run once to create the Super Admin account
// Usage: node seed-admin.js
// After running, delete or ignore this file — never run again

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');

// ─── Configure your Super Admin credentials here ──────────────────────────────
const SUPER_ADMIN = {
  name: 'Super Admin',
  email: 'superadmin@myschoollife.com',  // ← Change this
  password: 'SuperAdmin@2026!',           // ← Change this to a strong password
};

const seed = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await Admin.findOne({ email: SUPER_ADMIN.email.toLowerCase() });
    if (existing) {
      console.log(`[Seed] Admin already exists: ${SUPER_ADMIN.email}`);
      console.log('[Seed] To reset, delete the admin from DB and run again.');
      process.exit(0);
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, rounds);

    await Admin.create({
      name: SUPER_ADMIN.name,
      email: SUPER_ADMIN.email.toLowerCase(),
      password: hashedPassword,
      role: 'superadmin',
    });

    console.log(`\n✅ Super Admin created successfully!`);
    console.log(`   Email:    ${SUPER_ADMIN.email}`);
    console.log(`   Password: ${SUPER_ADMIN.password}`);
    console.log(`\n⚠️  Change the password after first login!`);
    console.log(`   Start server: npm run dev`);
    console.log(`   Login at: POST http://localhost:4000/api/auth/login\n`);
  } catch (err) {
    console.error('[Seed] Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
