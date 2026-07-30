const jwt = require('jsonwebtoken');
const AppError = require('../exceptions/AppError');

/**
 * authenticate
 *
 * Generic JWT verification middleware for the Docqube Workflow Engine.
 *
 * Validates the Bearer token signature using JWT_SECRET.
 * Trusts all claims embedded by the issuer (Docqube or local test tools).
 *
 * Expected JWT payload from Docqube:
 *   {
 *     id:        string   — user UUID in Docqube
 *     email:     string   — user email
 *     tenantId:  string   — tenant/customer UUID
 *     groups:    string[] — workflow group memberships (e.g. ['department_heads'])
 *     kieGroups: string[] — jBPM group identifiers (optional, overrides groups)
 *     kieUserId: string   — jBPM user identity (optional, overrides id/email)
 *   }
 *
 * No local user database lookup is performed.
 */
const authenticate = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authenticated. Provide a valid Bearer token.', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token.', 401));
  }
};

module.exports = { authenticate };
