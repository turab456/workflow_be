require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'Docqube Workflow Engine',
    timestamp: new Date().toISOString(),
  });
});

// ── Workflow Engine API ───────────────────────────────────────────────────────
// Generic, business-agnostic workflow endpoints for Docqube.
// Auth/RBAC is managed by Docqube; this engine trusts the incoming JWT.
const workflowRoutes = require('./core/workflow/routes');
app.use('/api/v1/workflow', workflowRoutes);

// ── Global Error Handler ──────────────────────────────────────────────────────
const errorHandler = require('./shared/middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
