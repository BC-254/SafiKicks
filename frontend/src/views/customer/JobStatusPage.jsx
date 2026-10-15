import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { registrationApi } from '../../api/registration.api';
import {
  Card,
  StatusBadge,
  PaymentBadge,
  Button,
  Spinner,
  Badge,
} from '../../design-system';
import { formatKES, formatDateTime, formatRelative } from '../../utils/formatters';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export function JobStatusPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const fetchStatus = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const res = await registrationApi.getJobStatus(token);
      setData(res);
      setError(null);
    } catch (err) {
      if (!isPolling) {
        setError(err.response?.data?.error || 'Unable to find repair job. Check your tracking link.');
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStatus();
    // Auto poll every 20 seconds for real-time progress updates
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12 }}>
        <Spinner size="lg" accent />
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Loading your repair status...
        </span>
      </div>
    );
  }

  if (error || !data?.job) {
    return (
      <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: 'var(--color-danger)', margin: '0 auto var(--space-4)' }} />
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>Tracking Link Invalid</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>{error}</p>
        <Button variant="primary" style={{ marginTop: 'var(--space-5)' }} onClick={() => navigate('/register')}>
          Register a New Repair
        </Button>
      </Card>
    );
  }

  const { job, timeline } = data;

  // Determine stage progression (0 to 4)
  const getStageIndex = (status) => {
    switch (status) {
      case 'Registered': return 0;
      case 'In Queue': return 1;
      case 'Awaiting Confirmation': return 1;
      case 'Started': return 2;
      case 'On Hold': return 2;
      case 'Completed': return 3;
      case 'Picked':
      case 'Closed': return 4;
      default: return 0;
    }
  };

  const currentStage = getStageIndex(job.status);

  const stages = [
    { label: 'Registered', sub: 'Online intake' },
    { label: 'Received', sub: 'Tagged at shop' },
    { label: 'Repairing', sub: 'Work in progress' },
    { label: 'Ready', sub: 'Awaiting pickup' },
    { label: 'Collected', sub: 'Released' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* ── MAIN STATUS CARD ──────────────────────────────────── */}
      <Card style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wider)' }}>
              Job Tracking
            </div>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: '2px 0 0' }}>
              {job.job_number}
            </h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <StatusBadge status={job.status} />
            <PaymentBadge status={job.payment_status} />
          </div>
        </div>

        {/* Shoe & Service Summary */}
        <div style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-secondary)',
          border: '1px solid var(--color-border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
              {job.service_name}
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {job.shoe_brand ? `${job.shoe_brand} • ${job.shoe_color || ''}` : 'Shoes'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--color-border-light)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Agreed Quote:
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
              {job.current_price != null ? formatKES(job.current_price) : 'Pending quote'}
            </span>
          </div>

          {job.balance_due != null && job.balance_due > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Balance Due at Pickup:
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-danger)' }}>
                {formatKES(job.balance_due)}
              </span>
            </div>
          )}
        </div>

        {/* Visual 5-Stage Stepper */}
        <div style={{ margin: 'var(--space-6) 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {/* Background line */}
            <div style={{
              position: 'absolute',
              top: 14,
              left: 20,
              right: 20,
              height: 2,
              backgroundColor: 'var(--color-border)',
              zIndex: 0,
            }} />

            {/* Active filled line */}
            <div style={{
              position: 'absolute',
              top: 14,
              left: 20,
              width: `${(currentStage / (stages.length - 1)) * 100 * 0.9}%`,
              height: 2,
              backgroundColor: 'var(--color-text-primary)',
              zIndex: 1,
              transition: 'var(--transition-base)',
            }} />

            {stages.map((stg, i) => {
              const isPast = i <= currentStage;
              const isCurrent = i === currentStage;
              return (
                <div key={stg.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: isPast ? 'var(--color-text-primary)' : 'var(--color-surface)',
                    color: isPast ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
                    border: `2px solid ${isPast ? 'var(--color-text-primary)' : 'var(--color-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    transition: 'var(--transition-base)',
                  }}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isCurrent ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
                    color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    marginTop: 6,
                    textAlign: 'center',
                  }}>
                    {stg.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CONTEXTUAL NOTICES & CALLS TO ACTION ─────────────── */}

        {/* Status: Awaiting Confirmation */}
        {job.status === 'Awaiting Confirmation' && (
          <div style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--status-awaiting-bg)',
            color: 'var(--status-awaiting-text)',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
              Quote Ready for Confirmation
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 2, marginBottom: 'var(--space-3)' }}>
              The technician assessed your shoes and proposed a quote of <strong>{formatKES(job.current_price)}</strong>.
            </div>
            <Button
              variant="primary"
              size="sm"
              block
              onClick={() => navigate(`/job/${token}/confirm-price`)}
            >
              Review & Confirm Quote <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* Status: Completed & Ready */}
        {job.status === 'Completed' && (
          <div style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--status-completed-bg)',
            color: 'var(--status-completed-text)',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
              Shoes Ready for Collection!
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
              Visit our counter to pick up your shoes. When you arrive, counter staff will trigger your secure SMS pickup code.
            </div>
          </div>
        )}

        {/* Status: Registered (Not yet dropped off) */}
        {job.status === 'Registered' && (
          <div className="alert alert-info">
            <Clock size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Awaiting Drop-off:</strong> Please bring your shoes to SoleCare within 48 hours to activate the repair queue.
            </div>
          </div>
        )}
      </Card>

      {/* ── REPAIR TIMELINE AUDIT ──────────────────────────────── */}
      <Card style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
          Repair Activity Log
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {timeline && timeline.length > 0 ? (
            timeline.map((event, idx) => (
              <div key={event.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-text-primary)',
                  marginTop: 6,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                    {event.notes || event.event_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {formatDateTime(event.created_at)} ({formatRelative(event.created_at)})
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              No logged events yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
