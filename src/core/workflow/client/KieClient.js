const axios = require('axios');
const AppError = require('../../../shared/exceptions/AppError');

class KieClient {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.KIE_SERVER_URL,
      auth: {
        username: process.env.KIE_SERVER_USER,
        password: process.env.KIE_SERVER_PASS
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async startProcess(containerId, processId, variables = {}) {
    try {
      const response = await this.client.post(`/containers/${containerId}/processes/${processId}/instances`, variables);
      return response.data; // process_instance_id
    } catch (error) {
      console.error('KIE Server Error:', error.response?.data || error.message);
      throw new AppError('Failed to start workflow process', 500);
    }
  }

  async abortProcess(containerId, processInstanceId) {
    try {
      await this.client.delete(`/containers/${containerId}/processes/instances/${processInstanceId}`);
      return true;
    } catch (error) {
      throw new AppError('Failed to abort workflow process', 500);
    }
  }
}

module.exports = new KieClient();
