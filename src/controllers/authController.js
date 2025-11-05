// src/controllers/authController.js
const Applicant = require('../models/Applicant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createToken = (applicant) => {
  return jwt.sign(
    { id: applicant._id, email: applicant.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, remember } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const applicant = await Applicant.findOne({ email: email.toLowerCase() });
    if (!applicant) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, applicant.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = createToken(applicant);

    // Cookie options
    const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // ms
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // set true in production (HTTPS)
      sameSite: 'lax',
      maxAge,
    });

    // Return user (without passwordHash)
    const safeUser = await Applicant.findById(applicant._id).select('-passwordHash -emailToken');

    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
};