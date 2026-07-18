require('dotenv').config();
const app = require('./app');
const sequelize = require('./core/database');

// Register all models so Sequelize knows about them before sync
require('./core/auth/models/User');
require('./core/roles/models/Role');
require('./core/permissions/models/Permission');
require('./core/workflow/models/WorkflowDefinition');
require('./core/workflow/models/WorkflowInstance');
require('./modules/contract/models/ContractRequest');
require('./modules/contract/models/ContractAttachment');
require('./modules/master/models/MasterContractType');

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(async () => {
    console.log('✅ Database connected successfully.');
    // Sync schema changes without dropping data
    await sequelize.sync({ alter: true });
    console.log('✅ Database schema synchronized.');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err.message);
    process.exit(1);
  });
