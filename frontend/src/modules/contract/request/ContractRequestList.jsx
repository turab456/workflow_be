import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { contractRequestApi } from './contractRequestApi';
import { StatusBadge, formatCurrency } from '../../../shared/components/UIComponents';
import { Plus } from 'lucide-react';

const ContractRequestList = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        // apiClient interceptor unwraps response.data.data
        // backend returns { total, page, pages, data: [...] }
        const response = await contractRequestApi.getAll();
        const rows = Array.isArray(response) ? response : (response?.data || []);

        if (currentUser.role === 'BUSINESS_USER') {
          setRequests(rows.filter(r => r.requester_id === currentUser.id));
        } else {
          setRequests(rows);
        }
      } catch (err) {
        setError('Failed to load contract requests.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>
            {currentUser.role === 'BUSINESS_USER' ? 'My Contract Requests' : 'All Contract Requests'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {loading ? 'Loading...' : `${requests.length} total request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {currentUser.role === 'BUSINESS_USER' && (
          <Link to="/contract-requests/new" className="btn btn-primary">
            <Plus size={18} /> New Request
          </Link>
        )}
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Contract Type</th>
                <th>Vendor</th>
                <th>Value</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Loading contract requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No contract requests found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600 }}>{req.title}</td>
                    <td style={{ fontSize: '0.875rem' }}>{req.contract_type}</td>
                    <td style={{ fontSize: '0.875rem' }}>{req.vendor}</td>
                    <td style={{ fontSize: '0.875rem' }}>{formatCurrency(req.contract_value)}</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{req.createdAt}</td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '0.8.rem', padding: '0.3rem 0.75rem' }}
                        onClick={() => navigate(`/contract-requests/${req.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractRequestList;
