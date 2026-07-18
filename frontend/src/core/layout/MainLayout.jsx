import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Settings, Users,
  Building, Truck, ClipboardCheck, LogOut, Scale
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const roleNavMap = {
  BUSINESS_USER: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'My Requests', path: '/contract-requests', icon: FileText },
  ],
  DEPARTMENT_HEAD: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Pending Approvals', path: '/tasks/dept-head', icon: ClipboardCheck },
    { name: 'All Requests', path: '/contract-requests', icon: FileText },
  ],
  PROCUREMENT: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Procurement Review', path: '/tasks/procurement', icon: ClipboardCheck },
    { name: 'All Requests', path: '/contract-requests', icon: FileText },
  ],
  LEGAL: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Legal Review', path: '/tasks/legal', icon: Scale },
    { name: 'All Requests', path: '/contract-requests', icon: FileText },
  ],
  SUPER_ADMIN: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'All Requests', path: '/contract-requests', icon: FileText },
    { name: 'Organizations', path: '/organizations', icon: Building },
    { name: 'Vendors', path: '/vendors', icon: Truck },
    { name: 'Users & Roles', path: '/users', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ],
};

const roleColors = {
  BUSINESS_USER: '#2563eb',
  DEPARTMENT_HEAD: '#d97706',
  PROCUREMENT: '#7c3aed',
  LEGAL: '#0891b2',
  SUPER_ADMIN: '#dc2626',
};

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const role = currentUser?.role || 'BUSINESS_USER';
  const navItems = roleNavMap[role] || roleNavMap.BUSINESS_USER;
  const roleColor = roleColors[role] || '#2563eb';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username
    : '';

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          CMS Enterprise
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{displayName}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: roleColor,
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: '1rem'
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'none', border: '1px solid var(--border-color)',
                borderRadius: '6px', padding: '0.4rem', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
