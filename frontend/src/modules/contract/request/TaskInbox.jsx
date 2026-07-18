import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { contractRequestApi } from './contractRequestApi';
import { StatusBadge, Alert, formatCurrency } from '../../../shared/components/UIComponents';
import { ClipboardCheck } from 'lucide-react';

const ROLE_GROUP_MAP = {
  DEPARTMENT_HEAD: { group: 'department_heads', title: 'Department Head Approvals', desc: 'Contract requests submitted by business users awaiting your approval.' },
  PROCUREMENT: { group: 'procurement', title: 'Procurement Review', desc: 'Requests approved by department heads, now requiring procurement sign-off.' },
  LEGAL: { group: 'legal', title: 'Legal Review', desc: 'Contracts flagged for legal review and counsel.' },
};

const TaskInbox = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const config = ROLE_GROUP_MAP[currentUser.role];

  useEffect(() => {
    const fetchTasks = async () => {
      if (!config) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await contractRequestApi.getAll();
        const rows = Array.isArray(response) ? response : (response?.data || []);
        setTasks(rows.filter(r => r.assigned_to_group === config.group));
      } catch (err) {
        setError('Failed to fetch tasks.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser, config]);

  if (!config) {
    return <Alert type="error">You do not have a task inbox for your current role.</Alert>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardCheck size={28} />
            {config.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{config.desc}</p>
        </div>
        <div style={{
          padding: '0.5rem 1.25rem',
          borderRadius: '9999px',
          backgroundColor: '#fef3c7',
          color: '#b45309',
          fontWeight: 700,
          fontSize: '0.9rem'
        }}>
          {loading ? '...' : `${tasks.length} Pending`}
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <ClipboardCheck size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No pending tasks. You are all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map((task) => (
            <div key={task.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem' }}>{task.title}</h3>
                  <StatusBadge status={task.status} />
                </div>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <span><strong>Type:</strong> {task.contract_type}</span>
                  <span><strong>Vendor:</strong> {task.vendor}</span>
                  <span><strong>Value:</strong> {formatCurrency(task.contract_value)}</span>
                  <span><strong>Requester:</strong> {task.requester}</span>
                  <span><strong>Submitted:</strong> {task.createdAt}</span>
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '600px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.scope_of_work}
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/contract-requests/${task.id}`)}
              >
                Review
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskInbox;
