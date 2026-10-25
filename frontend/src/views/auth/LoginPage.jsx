import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, Card } from '../../design-system';
import { Lock, ShieldAlert, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Default role landing pages
      if (result.user.role === 'owner') {
        navigate('/owner/dashboard', { replace: true });
      } else if (result.user.role === 'repairer') {
        navigate('/repairer/queue', { replace: true });
      } else if (result.user.role === 'counter_staff') {
        navigate('/counter/receipt', { replace: true });
      }
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      padding: 'var(--space-4)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-text-primary)',
            color: 'var(--color-text-inverse)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'var(--font-weight-bold)',
            fontSize: 'var(--font-size-xl)',
            marginBottom: 'var(--space-3)',
          }}>
            S
          </div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
            Staff Sign In
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
            Safi Kicks Shoe Repair & Revenue Control
          </p>
        </div>

        {/* Clean Apple-style Card */}
        <Card style={{ padding: 'var(--space-8)' }}>
          {errorMessage && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Input
              label="Staff Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={loading}
              style={{ marginTop: 'var(--space-2)' }}
            >
              Sign In
            </Button>
          </form>
        </Card>

        {/* Customer Portal Link */}
        <div style={{
          textAlign: 'center',
          marginTop: 'var(--space-6)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
        }}>
          Looking to drop off or check your shoes?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--color-accent)',
              fontWeight: 'var(--font-weight-semibold)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            Customer Registration <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
