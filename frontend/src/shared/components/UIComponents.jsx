import React from 'react';
import { CONTRACT_STATUSES } from '../utils/mockData';

export const StatusBadge = ({ status }) => {
  const s = CONTRACT_STATUSES[status] || CONTRACT_STATUSES.DRAFT;
  return (
    <span style={{
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
};

export const Alert = ({ type = 'info', children }) => {
  const styles = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
  };
  const s = styles[type];
  return (
    <div style={{ padding: '1rem', backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', color: s.color, fontSize: '0.875rem' }}>
      {children}
    </div>
  );
};

export const formatCurrency = (val) =>
  val ? `$${Number(val).toLocaleString()}` : '—';

export const WorkflowTimeline = ({ timeline }) => (
  <div style={{ marginTop: '1rem' }}>
    {timeline.map((event, idx) => (
      <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{event.actor}</span>
            <span style={{
              padding: '0.1rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: event.action === 'Approved' ? '#dcfce7' : event.action === 'Rejected' ? '#fee2e2' : '#eff6ff',
              color: event.action === 'Approved' ? '#16a34a' : event.action === 'Rejected' ? '#dc2626' : '#2563eb',
            }}>
              {event.action}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: 'auto' }}>{event.date}</span>
          </div>
          {event.comment && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{event.comment}</p>}
        </div>
      </div>
    ))}
  </div>
);
