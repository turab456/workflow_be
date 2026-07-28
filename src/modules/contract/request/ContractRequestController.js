const contractRequestService = require('./ContractRequestService');
const ApiResponse = require('../../../shared/responses/ApiResponse');

class ContractRequestController {
  async getAll(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await contractRequestService.getAllRequests({
        userId: req.user.id,
        role:   req.user.role,
        page, limit, status, search,
      });
      return ApiResponse.success(res, result, 'Contract Requests fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const request = await contractRequestService.getRequestById(req.params.id);
      return ApiResponse.success(res, request);
    } catch (error) {
      next(error);
    }
  }

  async createRequest(req, res, next) {
    try {
      const request = await contractRequestService.createRequest(req.body, req.user);
      return ApiResponse.success(res, request, 'Contract Request submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /contract-requests/:id/decision
   *
   * Body: { action: 'Approved'|'Rejected'|'SentBack', comment?: string, legalRequired?: boolean }
   *
   * Triggers the full KIE Claim → Start → Complete lifecycle, then
   * synchronises PostgreSQL state.
   */
  async processDecision(req, res, next) {
    try {
      const request = await contractRequestService.processDecision(
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, request, 'Workflow decision processed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /contract-requests/:id
   *
   * Generic field update (content edits, not workflow actions).
   */
  async updateRequest(req, res, next) {
    try {
      const request = await contractRequestService.updateRequest(
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, request, 'Contract Request updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRequest(req, res, next) {
    try {
      await contractRequestService.deleteRequest(req.params.id, req.user);
      return ApiResponse.success(res, null, 'Contract Request deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContractRequestController();
