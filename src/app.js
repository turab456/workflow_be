require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'CMS Backend is running.' });
});

// ── API Routes ──────────────────────────────────────────────────────────────
const authRoutes = require('./core/auth/routes');
const contractRequestRoutes = require('./modules/contract/request/routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/contract-requests', contractRequestRoutes);

// ── Global Error Handler ─────────────────────────────────────────────────────
const errorHandler = require('./shared/middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
