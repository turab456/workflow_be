require('dotenv').config();
const app = require('./app');
const sequelize = require('./core/database');

/**
 * Workflow Engine Models
 *
 * Only the two core workflow engine models are registered here.
 * All business domain models (User, ContractRequest, etc.) have been
 * removed — they are owned by Docqube.
 *
 * WorkflowDefinition  — stores BPMN process definitions per tenant/customer
 * WorkflowInstance    — tracks live jBPM process instance state
 */
require('./core/workflow/models/WorkflowDefinition');
require('./core/workflow/models/WorkflowInstance');

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(async () => {
    console.log('✅ Database connected successfully.');
    await sequelize.sync({ alter: true });
    console.log('✅ Database schema synchronized.');
    app.listen(PORT, () => {
      console.log(`🚀 Docqube Workflow Engine running on http://localhost:${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api/v1/workflow`);
      console.log(`   Health: http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err.message);
    process.exit(1);
  });
