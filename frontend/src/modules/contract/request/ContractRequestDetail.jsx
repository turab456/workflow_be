import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { contractRequestApi } from './contractRequestApi';
import { StatusBadge, Alert, WorkflowTimeline, formatCurrency } from '../../../shared/components/UIComponents';
import { ArrowLeft, CheckCircle, XCircle, CornerUpLeft, FileText } from 'lucide-react';

const NEXT_STATUS_MAP = {
  department_heads: {
    Approved: 'PROCUREMENT_REVIEW',
    Rejected: 'REJECTED',
    'Sent Back': 'SENT_BACK',
    nextGroup: 'procurement',
  },
  procurement: {
    Approved: 'LEGAL_REVIEW',
    Rejected: 'REJECTED',
    'Sent Back': 'DEPT_HEAD_REVIEW',
    nextGroup: 'legal',
  },
  legal: {
    Approved: 'APPROVED',
    Rejected: 'REJECTED',
    'Sent Back': 'PROCUREMENT_REVIEW',
    nextGroup: null,
  },
};

const ContractRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [actionDone, setActionDone] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const data = await contractRequestApi.getById(id);
        setRequest(data);
      } catch (err) {
        setError('Contract Request not found.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
    setActionDone(null);
  }, [id]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-outline" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
        </div>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading details...
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-outline" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
        </div>
        <Alert type="error">{error || 'Contract Request not found.'}</Alert>
      </div>
    );
  }

  const canAct = currentUser.groups.some(g => g === request.assigned_to_group) &&
    !['APPROVED', 'REJECTED'].includes(request.status);

  const handleAction = async (action) => {
    const groupKey = request.assigned_to_group;
    const statusMap = NEXT_STATUS_MAP[groupKey];
    if (!statusMap) return;

    const newStatus = statusMap[action];
    const nextGroup = statusMap.nextGroup;

    const newEvent = {
      actor: currentUser.name,
      action,
      date: new Date().toISOString().split('T')[0],
      comment: comment.trim(),
    };

    try {
      const updatedFields = {
        status: newStatus,
        assigned_to_group: action === 'Approved' ? nextGroup : (action === 'Sent Back' ? 'department_heads' : null),
        timeline: [...request.timeline, newEvent],
      };
      
      await contractRequestApi.update(request.id, updatedFields);

      setActionDone(action);
      setComment('');
      setRequest(prev => ({
        ...prev,
        ...updatedFields
      }));
    } catch (err) {
      console.error(err);
      setError('Failed to process workflow action.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 style={{ marginBottom: '0.1rem' }}>{request.title}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Request ID: {request.id}</p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {actionDone && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert type={actionDone === 'Approved' ? 'success' : actionDone === 'Rejected' ? 'error' : 'warning'}>
            ✓ You have <strong>{actionDone}</strong> this request successfully.
          </Alert>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <FileText size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Contract Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Contract Type</p>
                <p style={{ fontWeight: 600 }}>{request.contract_type}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Vendor</p>
                <p style={{ fontWeight: 600 }}>{request.vendor}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Contract Value</p>
                <p style={{ fontWeight: 600, fontSize: '1.25rem' }}>{formatCurrency(request.contract_value)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Duration</p>
                <p style={{ fontWeight: 600 }}>{request.contract_duration} Months</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Department</p>
                <p style={{ fontWeight: 600 }}>{request.department}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Requester</p>
                <p style={{ fontWeight: 600 }}>{request.requester}</p>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Scope of Work</p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>{request.scope_of_work}</p>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              Workflow Timeline
            </h3>
            <WorkflowTimeline timeline={request.timeline} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</h3>
            <StatusBadge status={request.status} />
            {request.assigned_to_group && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Awaiting: <strong style={{ textTransform: 'capitalize' }}>{request.assigned_to_group.replace('_', ' ')}</strong>
              </p>
            )}
          </div>

          {canAct && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                Your Review
              </h3>
              <div className="form-group">
                <label className="form-label">Comment (optional)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a note or decision rationale..."
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', backgroundColor: '#16a34a' }}
                  onClick={() => handleAction('Approved')}
                >
                  <CheckCircle size={18} /> Approve
                </button>
                <button
                  className="btn btn-outline"
                  style={{ justifyContent: 'center', borderColor: '#ea580c', color: '#ea580c' }}
                  onClick={() => handleAction('Sent Back')}
                >
                  <CornerUpLeft size={18} /> Send Back
                </button>
                <button
                  className="btn btn-outline"
                  style={{ justifyContent: 'center', borderColor: '#dc2626', color: '#dc2626' }}
                  onClick={() => handleAction('Rejected')}
                >
                  <XCircle size={18} /> Reject
                </button>
              </div>
            </div>
          )}

          {!canAct && !['APPROVED', 'REJECTED'].includes(request.status) && currentUser.role === 'BUSINESS_USER' && (
            <div className="card">
              <Alert type="info">
                Your request is currently with <strong style={{ textTransform: 'capitalize' }}>{(request.assigned_to_group || '').replace('_', ' ')}</strong> for review.
              </Alert>
            </div>
          )}
          {request.status === 'APPROVED' && (
            <div className="card"><Alert type="success">This contract request has been <strong>fully approved</strong> and is ready for contract creation.</Alert></div>
          )}
          {request.status === 'REJECTED' && (
            <div className="card"><Alert type="error">This request has been <strong>rejected</strong>.</Alert></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractRequestDetail;
