import React, { useState, useEffect, useCallback } from 'react';
import { ownerApi } from '../../api/owner.api';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  PageSpinner,
  useToast,
} from '../../design-system';
import { formatDateTime, formatRelative } from '../../utils/formatters';
import {
  ShieldCheck,
  Search,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Filter,
  FileText,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Event Types' },
  { value: 'job_registered', label: 'Job Registered' },
  { value: 'job_received', label: 'Physical Intake' },
  { value: 'job_claimed', label: 'Repairer Claimed' },
  { value: 'price_proposed', label: 'Price Proposed' },
  { value: 'price_confirmed', label: 'Customer Confirmed' },
  { value: 'price_declined', label: 'Customer Declined' },
  { value: 'job_started', label: 'Work Started' },
  { value: 'job_completed', label: 'Work Completed' },
  { value: 'payment_recorded', label: 'Payment Recorded' },
  { value: 'payment_reversed', label: 'Payment Reversed' },
  { value: 'code_generated', label: 'OTP Code Generated' },
  { value: 'job_picked', label: 'Job Picked Up' },
  { value: 'override_applied', label: 'Owner Override' },
  { value: 'approval_decided', label: 'Approval Decided' },
];

function getEventBadgeVariant(eventType) {
  if (eventType.includes('picked') || eventType.includes('completed') || eventType.includes('confirmed')) {
    return 'success';
  }
  if (eventType.includes('reversed') || eventType.includes('declined')) {
    return 'danger';
  }
  if (eventType.includes('override') || eventType.includes('approval')) {
    return 'warning';
  }
  return 'info';
}

export function AuditPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [jobNumber, setJobNumber] = useState('');
  const [eventType, setEventType] = useState('');
  const [actorLabel, setActorLabel] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expandable row state
  const [expandedId, setExpandedId] = useState(null);

  const toast = useToast();

  const fetchAuditFeed = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 25,
        job_number: jobNumber.trim() || undefined,
        event_type: eventType || undefined,
        actor_label: actorLabel.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const res = await ownerApi.getAuditFeed(params);
      setEvents(res.events || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error('Could not load audit feed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [page, jobNumber, eventType, actorLabel, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchAuditFeed();
  }, [fetchAuditFeed]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h1 style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--color-text)',
            marginBottom: 'var(--space-1)',
          }}>
            Immutable Audit Trail
          </h1>
          <Badge variant="success" size="sm">
            <Lock size={12} style={{ marginRight: '4px' }} /> Trigger Enforced
          </Badge>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Append-only cryptographic record of all status changes, price proposals, financial events, and overrides
        </p>
      </div>

      {/* Filter Card */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-3)',
            alignItems: 'center',
          }}>
            <Input
              placeholder="Search Job #..."
              value={jobNumber}
              onChange={(e) => { setJobNumber(e.target.value); setPage(1); }}
            />

            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setPage(1); }}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Input
              placeholder="Filter by Actor..."
              value={actorLabel}
              onChange={(e) => { setActorLabel(e.target.value); setPage(1); }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  flex: 1,
                }}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  flex: 1,
                }}
              />
            </div>
          </div>

          {(jobNumber || eventType || actorLabel || dateFrom || dateTo) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJobNumber('');
                  setEventType('');
                  setActorLabel('');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Main Audit Feed Table */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{
          padding: 'var(--space-3) var(--space-5)',
          borderBottom: 'var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Showing <strong>{events.length}</strong> of <strong>{total}</strong> immutable audit entries
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            PostgreSQL triggers prevent any UPDATE or DELETE operations
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <PageSpinner message="Loading audit feed..." />
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No audit records match the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{
                  borderBottom: 'var(--card-border)',
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: 'var(--color-surface-sunken)',
                }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', width: '40px' }}></th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Job #</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Event Type</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Actor</th>
                  <th style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600 }}>Audit Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const isExpanded = expandedId === ev.id;
                  const hasPayload = Boolean(ev.old_value || ev.new_value);

                  return (
                    <React.Fragment key={ev.id}>
                      <tr
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)',
                          cursor: hasPayload ? 'pointer' : 'default',
                          backgroundColor: isExpanded ? 'var(--color-surface-sunken)' : 'transparent',
                          transition: 'background-color 0.12s ease',
                        }}
                        onClick={() => hasPayload && toggleExpand(ev.id)}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                          {hasPayload ? (
                            isExpanded ? (
                              <ChevronDown size={14} color="var(--color-text-secondary)" />
                            ) : (
                              <ChevronRight size={14} color="var(--color-text-tertiary)" />
                            )
                          ) : null}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                            {formatDateTime(ev.created_at)}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                            {formatRelative(ev.created_at)}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-accent)' }}>
                          {ev.job_number}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <Badge variant={getEventBadgeVariant(ev.event_type)} size="sm">
                            {ev.event_type.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text)' }}>
                          <div style={{ fontWeight: 500 }}>{ev.actor_label}</div>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-5)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                          {ev.notes || '—'}
                        </td>
                      </tr>

                      {/* Expandable JSON Diff Row */}
                      {isExpanded && hasPayload && (
                        <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-sunken)' }}>
                          <td colSpan={6} style={{ padding: 'var(--space-3) var(--space-5) var(--space-4) var(--space-8)' }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: ev.old_value && ev.new_value ? '1fr 1fr' : '1fr',
                              gap: 'var(--space-4)',
                            }}>
                              {ev.old_value && (
                                <div style={{
                                  padding: 'var(--space-3)',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                }}>
                                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                                    Previous State
                                  </div>
                                  <pre style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    color: 'var(--color-text)',
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                  }}>
                                    {typeof ev.old_value === 'string'
                                      ? ev.old_value
                                      : JSON.stringify(ev.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {ev.new_value && (
                                <div style={{
                                  padding: 'var(--space-3)',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                }}>
                                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-success)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                                    New State
                                  </div>
                                  <pre style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    color: 'var(--color-text)',
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                  }}>
                                    {typeof ev.new_value === 'string'
                                      ? ev.new_value
                                      : JSON.stringify(ev.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: 'var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} /> Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
