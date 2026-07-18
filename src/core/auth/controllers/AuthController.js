const authService = require('../services/AuthService');
const ApiResponse = require('../../../shared/responses/ApiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.success(res, result, 'Registration successful', 201);
    } catch (error) { next(error); }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) { next(error); }
  }
}

module.exports = new AuthController();
