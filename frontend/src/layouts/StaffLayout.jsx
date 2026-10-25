import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RoleBadge } from '../design-system';
import {
  Inbox,
  CheckCircle2,
  Clock,
  QrCode,
  UserPlus,
  CreditCard,
  Layers,
  LogOut,
  User,
} from 'lucide-react';

import { useInactivityLogout } from '../hooks/useInactivityLogout';

export function StaffLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Inactivity timeout for shared terminal protection (SEC-01 / M13-07)
  useInactivityLogout();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isRepairer = user?.role === 'repairer';

  const navItems = isRepairer
    ? [
        { to: '/repairer/queue', label: 'Repair Queue', icon: <Inbox size={18} /> },
        { to: '/repairer/pickup', label: 'Release Shoes', icon: <CheckCircle2 size={18} /> },
        { to: '/repairer/activity', label: 'My Activity', icon: <Clock size={18} /> },
      ]
    : [
        { to: '/counter/receipt', label: 'Receive Shoes', icon: <QrCode size={18} /> },
        { to: '/counter/register', label: 'Register Customer', icon: <UserPlus size={18} /> },
        { to: '/counter/payment', label: 'Record Payment', icon: <CreditCard size={18} /> },
        { to: '/counter/jobs', label: 'Job Directory', icon: <Layers size={18} /> },
      ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hide-mobile" style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 'var(--z-raised)',
      }}>
        {/* Brand & Identity */}
        <div style={{
          padding: 'var(--space-6) var(--space-5)',
          borderBottom: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-text-primary)',
            color: 'var(--color-text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'var(--font-weight-bold)',
            fontSize: 'var(--font-size-md)',
          }}>
            S
          </div>
          <div>
            <div style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)', lineHeight: 1.2 }}>
              Safi Kicks
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Staff Portal
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav style={{ flex: 1, padding: 'var(--space-4) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                backgroundColor: isActive ? 'var(--color-surface-secondary)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-text-primary)' : '3px solid transparent',
                transition: 'var(--transition-fast)',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div style={{
          padding: 'var(--space-4) var(--space-4)',
          borderTop: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div>
              <RoleBadge role={user?.role} />
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: 80 }}>
        {/* Mobile Header */}
        <header className="hide-desktop" style={{
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontWeight: 'var(--font-weight-bold)' }}>Safi Kicks</span>
            <RoleBadge role={user?.role} />
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </header>

        <main style={{ flex: 1, padding: 'var(--space-6)', maxWidth: 'var(--content-max-width)', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="hide-desktop" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 'var(--z-raised)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              padding: '4px 8px',
            })}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
