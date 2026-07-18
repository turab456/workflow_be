import apiClient from '../../../shared/api/client';

export const contractRequestApi = {
  /**
   * GET /api/v1/contract-requests
   */
  getAll: async (params = {}) => {
    return apiClient.get('/contract-requests', { params });
  },

  /**
   * GET /api/v1/contract-requests/:id
   */
  getById: async (id) => {
    return apiClient.get(`/contract-requests/${id}`);
  },

  /**
   * POST /api/v1/contract-requests
   */
  create: async (data) => {
    return apiClient.post('/contract-requests', data);
  },

  /**
   * PUT /api/v1/contract-requests/:id
   */
  update: async (id, data) => {
    return apiClient.put(`/contract-requests/${id}`, data);
  },

  /**
   * DELETE /api/v1/contract-requests/:id
   */
  remove: async (id) => {
    return apiClient.delete(`/contract-requests/${id}`);
  },
};
