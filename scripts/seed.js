const sequelize = require('../src/core/database');
const User = require('../src/core/auth/models/User');
const Role = require('../src/core/roles/models/Role');
const Permission = require('../src/core/permissions/models/Permission');
const WorkflowDefinition = require('../src/core/workflow/models/WorkflowDefinition');
const WorkflowInstance = require('../src/core/workflow/models/WorkflowInstance');
const ContractRequest = require('../src/modules/contract/models/ContractRequest');
const ContractAttachment = require('../src/modules/contract/models/ContractAttachment');
const MasterContractType = require('../src/modules/master/models/MasterContractType');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Starting DB sync and seeding...');
    
    // Sync models
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully.');

    // Seed Master Contract Types
    const contractTypes = [
      { name: 'Transport Contract', description: 'Transportation and logistics agreements' },
      { name: 'Mining Services Contract', description: 'Mining and extraction operation services' },
      { name: 'Equipment Rental Contract', description: 'Heavy machinery and equipment rentals' },
      { name: 'Coal Supply Contract', description: 'Thermal and metallurgical coal supply agreements' },
      { name: 'Joint Venture Contract', description: 'Collaborative business ventures' },
      { name: 'Service Contract', description: 'General software or operational services' },
      { name: 'Non-Disclosure Agreement', description: 'Confidentiality agreements' },
    ];

    for (const type of contractTypes) {
      await MasterContractType.create(type);
    }
    console.log('Seeded Master Contract Types.');

    // Seed Roles & Users
    const mockUsers = [
      {
        username: 'alice',
        email: 'alice@cms.com',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: 'BUSINESS_USER'
      },
      {
        username: 'bob',
        email: 'bob@cms.com',
        password: 'password123',
        firstName: 'Bob',
        lastName: 'Williams',
        role: 'DEPARTMENT_HEAD'
      },
      {
        username: 'carol',
        email: 'carol@cms.com',
        password: 'password123',
        firstName: 'Carol',
        lastName: 'Davis',
        role: 'PROCUREMENT'
      },
      {
        username: 'david',
        email: 'david@cms.com',
        password: 'password123',
        firstName: 'David',
        lastName: 'Lee',
        role: 'LEGAL'
      },
      {
        username: 'eva',
        email: 'eva@cms.com',
        password: 'password123',
        firstName: 'Eva',
        lastName: 'Martinez',
        role: 'SUPER_ADMIN'
      }
    ];

    for (const u of mockUsers) {
      const hashed = await bcrypt.hash(u.password, 12);
      await User.create({
        ...u,
        password: hashed
      });
    }
    console.log('Seeded mock users successfully.');
    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
