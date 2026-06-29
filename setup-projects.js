const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate plain API keys for both schools
const greenwoodApiKey = 'gw-' + crypto.randomBytes(16).toString('hex');
const smApiKey = 'sm-' + crypto.randomBytes(16).toString('hex');

mongoose.connect('mongodb+srv://gkd:gkd785625%40Kd02@cluster0.hxh3fpj.mongodb.net/theme_server').then(async () => {
  // Get any admin to use as createdBy
  const admin = await mongoose.connection.db.collection('admins').findOne({});
  if (!admin) { console.log('NO_ADMIN_FOUND - create an admin first'); process.exit(1); }
  
  const createdBy = admin._id;
  const BCRYPT_ROUNDS = 10; // faster for setup

  console.log('Hashing API keys...');
  const [gwHash, smHash] = await Promise.all([
    bcrypt.hash(greenwoodApiKey, BCRYPT_ROUNDS),
    bcrypt.hash(smApiKey, BCRYPT_ROUNDS)
  ]);

  // Clean old mismatched project IDs if any (optional)
  await mongoose.connection.db.collection('projects').deleteMany({ projectId: { $in: ['greenwood', 'school-management'] } });

  // Upsert greenwood-academy project
  const gwResult = await mongoose.connection.db.collection('projects').updateOne(
    { projectId: 'greenwood-academy' },
    { $setOnInsert: { projectId: 'greenwood-academy', projectName: 'Greenwood Academy', apiKey: gwHash, domain: 'localhost:3001', status: 'active', createdBy, createdAt: new Date(), updatedAt: new Date() }},
    { upsert: true }
  );

  // Upsert modern-school project
  const smResult = await mongoose.connection.db.collection('projects').updateOne(
    { projectId: 'modern-school' },
    { $setOnInsert: { projectId: 'modern-school', projectName: 'Modern School', apiKey: smHash, domain: 'localhost:3000', status: 'active', createdBy, createdAt: new Date(), updatedAt: new Date() }},
    { upsert: true }
  );

  if (gwResult.upsertedCount === 0) {
    console.log('[greenwood-academy] Already existed — not overwriting API key.');
  } else {
    console.log('[greenwood-academy] Created new project.');
    console.log('GREENWOOD_API_KEY=' + greenwoodApiKey);
  }

  if (smResult.upsertedCount === 0) {
    console.log('[modern-school] Already existed — not overwriting API key.');
  } else {
    console.log('[modern-school] Created new project.');
    console.log('SCHOOL_MGMT_API_KEY=' + smApiKey);
  }

  console.log('\n=== Add these to your .env files ===');
  console.log('LAYOUT_PROJECT_ID for greenwood = greenwood-academy');
  console.log('LAYOUT_PROJECT_ID for school-management = modern-school');

  process.exit(0);
}).catch(e => { console.error('DB Error:', e.message); process.exit(1); });
