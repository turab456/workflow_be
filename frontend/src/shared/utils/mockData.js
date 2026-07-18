// Shared mock data store — simulates backend state across views
// In production this would be API calls. Each item represents a ContractRequest.

export const CONTRACT_STATUSES = {
  DRAFT: { label: 'Draft', color: '#94a3b8', bg: '#f1f5f9' },
  SUBMITTED: { label: 'Submitted', color: '#2563eb', bg: '#dbeafe' },
  DEPT_HEAD_REVIEW: { label: 'Dept Head Review', color: '#d97706', bg: '#fef3c7' },
  PROCUREMENT_REVIEW: { label: 'Procurement Review', color: '#7c3aed', bg: '#ede9fe' },
  LEGAL_REVIEW: { label: 'Legal Review', color: '#0891b2', bg: '#cffafe' },
  APPROVED: { label: 'Approved', color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
  SENT_BACK: { label: 'Sent Back', color: '#ea580c', bg: '#ffedd5' },
};

export const CONTRACT_TYPES = [
  { id: 'type-1', name: 'Transport Contract' },
  { id: 'type-2', name: 'Mining Services Contract' },
  { id: 'type-3', name: 'Equipment Rental Contract' },
  { id: 'type-4', name: 'Coal Supply Contract' },
  { id: 'type-5', name: 'Joint Venture Contract' },
  { id: 'type-6', name: 'Service Contract' },
  { id: 'type-7', name: 'Non-Disclosure Agreement' },
];

export let mockContractRequests = [
  {
    id: 'req-001',
    title: 'Quarterly Coal Supply Agreement',
    contract_type: 'Coal Supply Contract',
    contract_value: 1200000,
    contract_duration: 12,
    scope_of_work: 'Supply of 5000 metric tons of thermal coal per month for power generation plant operations.',
    vendor: 'Apex Mining Co.',
    department: 'Operations',
    requester: 'Alice Johnson',
    requester_id: 'u-001',
    status: 'DEPT_HEAD_REVIEW',
    assigned_to_group: 'department_heads',
    timeline: [
      { actor: 'Alice Johnson', action: 'Submitted', date: '2026-07-15', comment: '' },
    ],
    createdAt: '2026-07-15',
  },
  {
    id: 'req-002',
    title: 'Heavy Equipment Rental - Q3',
    contract_type: 'Equipment Rental Contract',
    contract_value: 350000,
    contract_duration: 3,
    scope_of_work: 'Rental of 3x CAT 390F excavators and 2x Komatsu HD785-7 dump trucks for open-cast mining.',
    vendor: 'Caterpillar Inc.',
    department: 'Mining',
    requester: 'Alice Johnson',
    requester_id: 'u-001',
    status: 'PROCUREMENT_REVIEW',
    assigned_to_group: 'procurement',
    timeline: [
      { actor: 'Alice Johnson', action: 'Submitted', date: '2026-07-10', comment: '' },
      { actor: 'Bob Williams', action: 'Approved', date: '2026-07-12', comment: 'Reviewed and approved. Forwarding to Procurement.' },
    ],
    createdAt: '2026-07-10',
  },
  {
    id: 'req-003',
    title: 'IT Services NDA with TechSoft',
    contract_type: 'Non-Disclosure Agreement',
    contract_value: 0,
    contract_duration: 24,
    scope_of_work: 'Mutual NDA for data sharing during software integration project.',
    vendor: 'TechSoft Solutions',
    department: 'IT',
    requester: 'Alice Johnson',
    requester_id: 'u-001',
    status: 'LEGAL_REVIEW',
    assigned_to_group: 'legal',
    timeline: [
      { actor: 'Alice Johnson', action: 'Submitted', date: '2026-07-08', comment: '' },
      { actor: 'Bob Williams', action: 'Approved', date: '2026-07-09', comment: 'Approved with note: requires legal sign-off.' },
      { actor: 'Carol Davis', action: 'Approved', date: '2026-07-11', comment: 'Procurement confirmed vendor is registered.' },
    ],
    createdAt: '2026-07-08',
  },
];

export const addMockRequest = (req) => {
  mockContractRequests = [req, ...mockContractRequests];
};

export const updateMockRequest = (id, updates) => {
  mockContractRequests = mockContractRequests.map(r =>
    r.id === id ? { ...r, ...updates } : r
  );
};
