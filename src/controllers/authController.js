// ─── src/controllers/authController.js ───────────────────────────────────────
// Super Admin authentication — login only (no self-registration via API)
// Use seed-admin.js to create the initial admin account

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const Admin = require('../models/Admin');

// Zod schema for input validation
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const login = async (req, res, next) => {
  try {
    // Step 1: Validate input — reject malformed requests early
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors.map((e) => e.message).join('. '),
      });
    }

    const { email, password } = result.data;

    // Step 2: Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    // SECURITY: Same error message whether user not found or wrong password
    // Prevents email enumeration attacks
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Step 3: Compare password with stored bcrypt hash
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Step 4: Sign JWT — include id, email, role for middleware validation
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // SECURITY: Never log the token or password
    console.log(`[Auth] Super Admin logged in: ${admin.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get current authenticated admin profile
const getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }
    return res.status(200).json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe };
