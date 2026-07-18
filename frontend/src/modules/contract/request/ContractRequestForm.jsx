import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { contractRequestApi } from './contractRequestApi';

const ContractRequestForm = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    contract_type: '',
    department: '',
    vendor: '',
    contract_value: '',
    contract_duration: '',
    scope_of_work: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        contract_type: formData.contract_type,
        department: formData.department,
        vendor: formData.vendor,
        contract_value: parseFloat(formData.contract_value) || 0,
        contract_duration: parseInt(formData.contract_duration) || 0,
        scope_of_work: formData.scope_of_work,
      };
      
      await contractRequestApi.create(payload);
      navigate('/contract-requests');
    } catch (err) {
      setError('Failed to submit request.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>New Contract Request</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Initiate a new contract process.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {error && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Contract Title *</label>
              <input type="text" name="title" className="form-control" value={formData.title} onChange={handleChange} required placeholder="e.g., Q3 Coal Supply Agreement" />
            </div>
            <div className="form-group">
              <label className="form-label">Contract Type *</label>
              <select name="contract_type" className="form-control" value={formData.contract_type} onChange={handleChange} required>
                <option value="">Select Type...</option>
                <option>Transport Contract</option>
                <option>Mining Services Contract</option>
                <option>Equipment Rental Contract</option>
                <option>Coal Supply Contract</option>
                <option>Joint Venture Contract</option>
                <option>Service Contract</option>
                <option>Non-Disclosure Agreement</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select name="department" className="form-control" value={formData.department} onChange={handleChange} required>
                <option value="">Select Department...</option>
                <option>Operations</option>
                <option>Mining</option>
                <option>Information Technology</option>
                <option>Finance</option>
                <option>Procurement</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vendor / Contractor *</label>
              <select name="vendor" className="form-control" value={formData.vendor} onChange={handleChange} required>
                <option value="">Select Vendor...</option>
                <option>Apex Mining Co.</option>
                <option>Caterpillar Inc.</option>
                <option>TechSoft Solutions</option>
                <option>Amazon Web Services</option>
                <option>Global Logistics Ltd.</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Contract Value (USD)</label>
              <input type="number" name="contract_value" className="form-control" value={formData.contract_value} onChange={handleChange} placeholder="e.g., 250000" />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (Months)</label>
              <input type="number" name="contract_duration" className="form-control" value={formData.contract_duration} onChange={handleChange} placeholder="e.g., 12" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Scope of Work *</label>
            <textarea name="scope_of_work" className="form-control" rows="5" value={formData.scope_of_work} onChange={handleChange} required placeholder="Describe the deliverables, obligations, and boundaries of this contract..." />
          </div>

          <div className="form-group">
            <label className="form-label">Supporting Documents</label>
            <input type="file" className="form-control" style={{ padding: '0.5rem' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Upload RFQs, existing agreements, or relevant documentation.</p>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/contract-requests')} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractRequestForm;
