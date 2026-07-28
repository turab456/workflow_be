const { Op } = require('sequelize');
const ContractRequest = require('../models/ContractRequest');
const workflowProcessService = require('../../../core/workflow/services/WorkflowProcessService');
const workflowTaskService = require('../../../core/workflow/services/WorkflowTaskService');
const AppError = require('../../../shared/exceptions/AppError');

/**
 * WORKFLOW DECISION TABLE
 *
 * Maps the current assigned_to_group + the reviewer's action
 * to the BPMN output variables and the next PostgreSQL state.
 *
 * "legalRequired" is passed at runtime by the Procurement reviewer.
 *
 * ┌─────────────────┬──────────────────┬──────────────────────────┬────────────────────┬──────────────────────┐
 * │ Current Group   │ Action           │ BPMN Variables           │ Next Status (DB)   │ Next Group (DB)      │
 * ├─────────────────┼──────────────────┼──────────────────────────┼────────────────────┼──────────────────────┤
 * │ department_heads│ Approved         │ deptHeadApproved: true   │ PROCUREMENT_REVIEW │ procurement          │
 * │ department_heads│ Rejected         │ deptHeadApproved: false  │ REJECTED           │ null                 │
 * │ procurement     │ Approved (legal) │ procurementApproved: true│ LEGAL_REVIEW       │ legal                │
 * │ procurement     │ Approved (no leg)│ procurementApproved: true│ APPROVED           │ null                 │
 * │ procurement     │ Rejected         │ procurementApproved:false│ REJECTED           │ null                 │
 * │ legal           │ Approved         │ legalApproved: true      │ APPROVED           │ null                 │
 * │ legal           │ Rejected         │ legalApproved: false     │ REJECTED           │ null                 │
 * └─────────────────┴──────────────────┴──────────────────────────┴────────────────────┴──────────────────────┘
 */

/**
 * Map role → assigned_to_group string stored in PostgreSQL.
 */
const ROLE_TO_GROUP = {
  DEPARTMENT_HEAD: 'department_heads',
  PROCUREMENT:     'procurement',
  LEGAL:           'legal',
};

class ContractRequestService {
  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  async getAllRequests({ userId, role, page = 1, limit = 20, status, search }) {
    const where = {};

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

  // ─────────────────────────────────────────────────────────────
  // Create (Business User submits)
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a ContractRequest record, then starts the jBPM process.
   * Initial state: DEPT_HEAD_REVIEW / department_heads.
   */
  async createRequest(data, user) {
    // 1. Persist business record first so we have an id for the process variables
    const request = await ContractRequest.create({
      title:             data.title,
      description:       data.description,
      requester_id:      user.id,
      department:        data.department,
      vendor:            data.vendor,
      contract_type:     data.contract_type,
      contract_value:    data.contract_value,
      contract_duration: data.contract_duration,
      scope_of_work:     data.scope_of_work,
      status:            'DEPT_HEAD_REVIEW',
      assigned_to_group: 'department_heads',
      timeline: [
        {
          actor:   `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          action:  'Submitted',
          date:    new Date().toISOString().split('T')[0],
          comment: '',
        },
      ],
      createdBy: user.id,
    });

    // 2. Start jBPM process (non-blocking — KIE may not be running in dev)
    try {
      const variables = {
        requestId:           request.id,
        requesterId:         user.id,
        department:          data.department,
        vendor:              data.vendor,
        contractValue:       data.contract_value,
        contractType:        data.contract_type,
        // Gateway decision variables — start as null; updated by task completion
        deptHeadApproved:    null,
        procurementApproved: null,
        legalApproved:       null,
        legalRequired:       false, // Procurement sets this at decision time
      };

      const instance = await workflowProcessService.startProcess(
        'CONTRACT_REQUEST',
        request.id,
        variables,
        user.customerId || null,
        user.id,
      );

      request.workflow_instance_id = instance.id;
      await request.save();

      console.log(
        `[ContractRequestService] Started workflow instance ${instance.id} ` +
        `for contract request ${request.id}`
      );
    } catch (workflowError) {
      // Log warning but do NOT fail the request creation.
      // In dev environments KIE Server may not be running; local DB flow still works.
      console.warn(
        '[ContractRequestService] Could not start KIE process — ' +
        `running in local-only mode. Reason: ${workflowError.message}`
      );
    }

    return request;
  }

  // ─────────────────────────────────────────────────────────────
  // Workflow action: reviewer approves / rejects / sends back
  // ─────────────────────────────────────────────────────────────

  /**
   * Process a reviewer's decision on a contract request.
   *
   * This is the KEY method that:
   *   1. Validates the reviewer is authorised for the current task.
   *   2. Determines the BPMN variables and next DB state.
   *   3. Calls WorkflowTaskService.completeWorkflowTask() → KIE lifecycle.
   *   4. Updates ContractRequest in PostgreSQL to reflect the new state.
   *
   * @param {string} requestId          — UUID of the ContractRequest
   * @param {object} decision           — { action, comment, legalRequired? }
   *   action:       'Approved' | 'Rejected' | 'SentBack'
   *   comment:      reviewer comment (stored in timeline)
   *   legalRequired: boolean — only relevant for Procurement approvals
   * @param {object} user               — req.user (id, role, firstName, lastName)
   */
  async processDecision(requestId, decision, user) {
    const { action, comment = '', legalRequired = true } = decision;

    // 1. Load the request
    const request = await this.getRequestById(requestId);

    // 2. Determine reviewer's group
    const reviewerGroup = ROLE_TO_GROUP[user.role];
    if (!reviewerGroup) {
      throw new AppError(
        `Role "${user.role}" is not a workflow reviewer role.`,
        403
      );
    }

    // 3. Check the request is currently assigned to this reviewer's group
    if (request.assigned_to_group !== reviewerGroup) {
      throw new AppError(
        `This request is currently assigned to "${request.assigned_to_group}", ` +
        `not "${reviewerGroup}". You cannot act on it now.`,
        403
      );
    }

    // 4. Resolve BPMN variables + next PostgreSQL state
    const { bpmnVariables, nextStatus, nextGroup } = this._resolveDecision(
      reviewerGroup,
      action, 
      legalRequired
    );  

    // 5. Build timeline event
    const displayName =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;

    const timelineEvent = {
      actor:   displayName,
      action,
      date:    new Date().toISOString().split('T')[0],
      comment: comment.trim(),
    };

    // 6. Complete the Human Task on KIE Server (Claim → Start → Complete)
    //    This passes bpmnVariables to the process so the gateway can evaluate them.
    let kieCompleted = false;
    if (request.workflow_instance_id) {
      try {
        const result = await workflowTaskService.completeWorkflowTask(
          requestId,
          bpmnVariables,
          user.role
        );
        kieCompleted = true;
        console.log(
          `[ContractRequestService] KIE task "${result.taskName}" completed. ` +
          `Gateway will route to next node automatically.`
        );
      } catch (workflowError) {
        // In dev without KIE, log and continue with local state update only.
        console.warn(
          `[ContractRequestService] KIE task completion failed — ` +
          `updating local DB only. Reason: ${workflowError.message}`
        );
      }
    } else {
      console.warn(
        `[ContractRequestService] No workflow_instance_id on request ${requestId} — ` +
        'skipping KIE task completion. Operating in local-only mode.'
      );
    }

    // 7. Synchronise PostgreSQL state to match what KIE gateway decided
    await request.update({
      status:            nextStatus,
      assigned_to_group: nextGroup,
      timeline:          [...(request.timeline || []), timelineEvent],
      updatedBy:         user.id,
    });

    console.log(
      `[ContractRequestService] Request ${requestId} updated — ` +
      `status: ${nextStatus}, group: ${nextGroup || 'none'}, kieCompleted: ${kieCompleted}`
    );

    return request.reload();
  }

  // ─────────────────────────────────────────────────────────────
  // Generic field update (for content edits, not workflow actions)
  // ─────────────────────────────────────────────────────────────

  async updateRequest(id, data, user) {
    const request = await this.getRequestById(id);

    const isRequester      = request.requester_id === user.id;
    const isAdmin          = user.role === 'SUPER_ADMIN';
    const reviewerGroup    = ROLE_TO_GROUP[user.role];
    const isAssignedReviewer =
      reviewerGroup && request.assigned_to_group === reviewerGroup;

    if (!isRequester && !isAssignedReviewer && !isAdmin) {
      throw new AppError('You are not authorized to update this request.', 403);
    }

    // Business users can only edit DRAFT or SENT_BACK requests
    if (
      isRequester &&
      !isAssignedReviewer &&
      !isAdmin &&
      !['DRAFT', 'SENT_BACK'].includes(request.status)
    ) {
      throw new AppError('Only DRAFT or SENT_BACK requests can be edited.', 400);
    }

    await request.update({ ...data, updatedBy: user.id });
    return request;
  }

  // ─────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────

  async deleteRequest(id, user) {
    const request = await this.getRequestById(id);
    if (request.requester_id !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new AppError('Not authorized.', 403);
    }
    await request.destroy(); // soft delete via paranoid
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // Internal decision resolver
  // ─────────────────────────────────────────────────────────────

  /**
   * Pure function — maps (group, action, legalRequired) → BPMN variables + next DB state.
   * No I/O; fully testable in isolation.
   *
   * @param {string}  group
   * @param {string}  action         'Approved' | 'Rejected' | 'SentBack'
   * @param {boolean} legalRequired  only used for Procurement Approved path
   * @returns {{ bpmnVariables: object, nextStatus: string, nextGroup: string|null }}
   */
  _resolveDecision(group, action, legalRequired) {
    switch (group) {

      // ── Department Head ─────────────────────────────────────
      case 'department_heads':
        if (action === 'Approved') {
          return {
            bpmnVariables: { deptHeadApproved: true },
            nextStatus:    'PROCUREMENT_REVIEW',
            nextGroup:     'procurement',
          };
        }
        if (action === 'Rejected') {
          return {
            bpmnVariables: { deptHeadApproved: false },
            nextStatus:    'REJECTED',
            nextGroup:     null,
          };
        }
        if (action === 'SentBack') {
          // Sent back to business user — no KIE task to complete; handled locally only.
          return {
            bpmnVariables: { deptHeadApproved: false },
            nextStatus:    'SENT_BACK',
            nextGroup:     null,
          };
        }
        break;

      // ── Procurement ──────────────────────────────────────────
      case 'procurement':
        if (action === 'Approved') {
          if (legalRequired) {
            return {
              bpmnVariables: { procurementApproved: true, legalRequired: true },
              nextStatus:    'LEGAL_REVIEW',
              nextGroup:     'legal',
            };
          }
          return {
            bpmnVariables: { procurementApproved: true, legalRequired: false },
            nextStatus:    'APPROVED',
            nextGroup:     null,
          };
        }
        if (action === 'Rejected') {
          return {
            bpmnVariables: { procurementApproved: false },
            nextStatus:    'REJECTED',
            nextGroup:     null,
          };
        }
        if (action === 'SentBack') {
          return {
            bpmnVariables: { procurementApproved: false },
            nextStatus:    'DEPT_HEAD_REVIEW',
            nextGroup:     'department_heads',
          };
        }
        break;

      // ── Legal ────────────────────────────────────────────────
      case 'legal':
        if (action === 'Approved') {
          return {
            bpmnVariables: { legalApproved: true },
            nextStatus:    'APPROVED',
            nextGroup:     null,
          };
        }
        if (action === 'Rejected') {
          return {
            bpmnVariables: { legalApproved: false },
            nextStatus:    'REJECTED',
            nextGroup:     null,
          };
        }
        if (action === 'SentBack') {
          return {
            bpmnVariables: { legalApproved: false },
            nextStatus:    'PROCUREMENT_REVIEW',
            nextGroup:     'procurement',
          };
        }
        break;

      default:
        throw new AppError(`Unknown reviewer group: "${group}"`, 400);
    }

    throw new AppError(
      `Unsupported action "${action}" for group "${group}"`,
      400
    );
  }
}

module.exports = new ContractRequestService();
