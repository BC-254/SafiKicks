import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getInitials } from '../utils/formatters';
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  DollarSign,
  BarChart3,
  ShieldCheck,
  Tag,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export function OwnerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'Overview',
      items: [
        { to: '/owner/dashboard', label: 'Executive View', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { to: '/owner/jobs', label: 'All Jobs', icon: <Layers size={18} /> },
        { to: '/owner/approvals', label: 'Approvals & Overrides', icon: <CheckSquare size={18} /> },
      ],
    },
    {
      title: 'Finance',
      items: [
        { to: '/owner/reconciliation', label: 'Daily Day-Close', icon: <DollarSign size={18} /> },
        { to: '/owner/reports', label: 'Revenue & SMS Reports', icon: <BarChart3 size={18} /> },
      ],
    },
    {
      title: 'Compliance',
      items: [
        { to: '/owner/audit', label: 'Audit Trail (Immutable)', icon: <ShieldCheck size={18} /> },
      ],
    },
    {
      title: 'Settings',
      items: [
        { to: '/owner/catalog', label: 'Service Catalog', icon: <Tag size={18} /> },
        { to: '/owner/staff', label: 'Staff Accounts', icon: <Users size={18} /> },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Owner Sidebar (Desktop) */}
      <aside className="hide-mobile" style={{
        width: 250,
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 'var(--z-raised)',
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-6) var(--space-5)',
          borderBottom: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <div style={{
            width: 36,
            height: 36,
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
              SoleCare
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Owner Control Center
            </div>
          </div>
        </div>

        {/* Scrollable Nav Sections */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-3)' }}>
          {navSections.map((sec) => (
            <div key={sec.title} style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{
                fontSize: 10,
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--letter-spacing-wider)',
                color: 'var(--color-text-tertiary)',
                padding: '4px 12px',
                marginBottom: 2,
              }}>
                {sec.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sec.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: '8px 12px',
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
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Profile & Logout */}
        <div style={{
          padding: 'var(--space-4) var(--space-4)',
          borderTop: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--status-picked-bg)',
              color: 'var(--status-picked-text)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {getInitials(user?.name || 'Owner')}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Administrator
              </div>
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

      {/* Main Content Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile Nav Top Bar */}
        <header className="hide-desktop" style={{
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 'var(--font-weight-bold)' }}>SoleCare Owner</span>
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

        {/* Dynamic page content */}
        <main style={{
          flex: 1,
          padding: 'var(--space-8)',
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
