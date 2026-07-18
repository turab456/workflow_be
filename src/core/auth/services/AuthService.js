const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../../../shared/exceptions/AppError');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'BUSINESS_USER' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

class AuthService {
  async register(data) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) throw new AppError('Email is already registered.', 400);

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      username: data.username,
      email: data.email,
      password: hashed,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    const token = signToken(user);
    return { token, user: { id: user.id, email: user.email, username: user.username, firstName: user.firstName, lastName: user.lastName, role: user.role || 'BUSINESS_USER' } };
  }

  async login(data) {
    const user = await User.findOne({ where: { email: data.email } });
    if (!user) throw new AppError('Invalid email or password.', 401);

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new AppError('Invalid email or password.', 401);
    if (!user.isActive) throw new AppError('Your account has been deactivated.', 403);

    const token = signToken(user);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'BUSINESS_USER',
      }
    };
  }
}

module.exports = new AuthService();
