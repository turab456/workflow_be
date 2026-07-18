const { Op } = require('sequelize');
const ContractRequest = require('../models/ContractRequest');
const workflowProcessService = require('../../../core/workflow/services/WorkflowProcessService');
const AppError = require('../../../shared/exceptions/AppError');

class ContractRequestService {

  async getAllRequests({ userId, role, page = 1, limit = 20, status, search }) {
    const where = {};

    // Business users only see their own requests
    if (role === 'BUSINESS_USER') {
      where.requester_id = userId;
    }
    if (status) where.status = status;
    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await ContractRequest.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      data: rows,
    };
  }

  async getRequestById(id) {
    const request = await ContractRequest.findByPk(id);
    if (!request) throw new AppError('Contract Request not found.', 404);
    return request;
  }

  async createRequest(data, user) {
    const request = await ContractRequest.create({
      title: data.title,
      description: data.description,
      requester_id: user.id,
      department: data.department,
      vendor: data.vendor,
      contract_type: data.contract_type,
      contract_value: data.contract_value,
      contract_duration: data.contract_duration,
      scope_of_work: data.scope_of_work,
      status: 'SUBMITTED',
      createdBy: user.id,
    });

    try {
      const variables = {
        requestId: request.id,
        requesterId: user.id,
        department: data.department,
        vendor: data.vendor,
      };

      const instance = await workflowProcessService.startProcess(
        'CONTRACT_REQUEST',
        request.id,
        variables,
        user.customerId || null,
        user.id
      );

      request.workflow_instance_id = instance.id;
      request.status = 'DEPT_HEAD_REVIEW';
      await request.save();
    } catch (workflowError) {
      // Log warning but don't fail the request — KIE may not be running yet
      console.warn('[WorkflowService] Could not start process:', workflowError.message);
    }

    return request;
  }

  async updateRequest(id, data, user) {
    const request = await this.getRequestById(id);

    const isRequester = request.requester_id === user.id;
    const isAdmin = user.role === 'SUPER_ADMIN';

    // Map user roles to workflow groups
    const userGroups = [];
    if (user.role === 'DEPARTMENT_HEAD') userGroups.push('department_heads');
    if (user.role === 'PROCUREMENT') userGroups.push('procurement');
    if (user.role === 'LEGAL') userGroups.push('legal');

    const isAssignedReviewer = request.assigned_to_group && userGroups.includes(request.assigned_to_group);

    if (!isRequester && !isAssignedReviewer && !isAdmin) {
      throw new AppError('You are not authorized to update this request.', 403);
    }

    // Requester can only update files/content when request is in edit state
    if (isRequester && !isAssignedReviewer && !isAdmin && !['DRAFT', 'SENT_BACK'].includes(request.status)) {
      throw new AppError('Only DRAFT or SENT_BACK requests can be edited.', 400);
    }

    await request.update({ ...data, updatedBy: user.id });
    return request;
  }

  async deleteRequest(id, user) {
    const request = await this.getRequestById(id);
    if (request.requester_id !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new AppError('Not authorized.', 403);
    }
    await request.destroy(); // soft delete via paranoid
    return true;
  }
}

module.exports = new ContractRequestService();
