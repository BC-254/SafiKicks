import { Outlet, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function CustomerLayout() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 'var(--space-4)',
    }}>
      {/* Minimal Header */}
      <header style={{
        width: '100%',
        maxWidth: 'var(--customer-max-width)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) 0 var(--space-6)',
      }}>
        <Link to="/register" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          textDecoration: 'none',
          color: 'var(--color-text-primary)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-text-primary)',
            color: 'var(--color-text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'var(--font-weight-bold)',
            fontSize: 'var(--font-size-base)',
          }}>
            S
          </div>
          <span style={{
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-md)',
            letterSpacing: 'var(--letter-spacing-tight)',
          }}>
            SoleCare
          </span>
        </Link>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          fontWeight: 'var(--font-weight-medium)',
        }}>
          Official Service
        </span>
      </header>

      {/* Main Content Area */}
      <main style={{
        width: '100%',
        maxWidth: 'var(--customer-max-width)',
        flex: 1,
      }}>
        <Outlet />
      </main>

      {/* Clean Subtle Footer */}
      <footer style={{
        width: '100%',
        maxWidth: 'var(--customer-max-width)',
        padding: 'var(--space-8) 0 var(--space-4)',
        textAlign: 'center',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
      }}>
        <p>SoleCare Shoe Repair & Care • All Rights Reserved</p>
      </footer>
    </div>
  );
}
