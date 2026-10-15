import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ownerApi } from '../../api/owner.api';
import {
  Card,
  CardHeader,
  Button,
  StatusBadge,
  PaymentBadge,
  Badge,
  PageSpinner,
  useToast,
} from '../../design-system';
import { formatKES, formatDateTime, formatRelative } from '../../utils/formatters';
import {
  Wrench,
  TrendingUp,
  PackageCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Coins,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await ownerApi.getDashboard();
      setData(res);
    } catch (err) {
      toast.error('Could not load dashboard data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <PageSpinner message="Loading executive dashboard..." />;
  }

  const { kpis = {}, statusCounts = {}, cashSummary = {}, recentJobs = [] } = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
      }}>
        <div>
          <h1 style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--color-text)',
            marginBottom: 'var(--space-1)',
          }}>
            Operations Overview
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Real-time shop health, revenue collections, and job progression
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} style={{ marginRight: '6px' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        {/* KPI 1: Active Jobs */}
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Jobs
              </span>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {kpis.activeJobs ?? 0}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                In repair, intake, or confirmation
              </p>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-surface-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}>
              <Wrench size={20} />
            </div>
          </div>
        </Card>

        {/* KPI 2: Today's Revenue */}
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Today's Revenue
              </span>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-accent)', marginTop: 'var(--space-1)' }}>
                {formatKES(kpis.todayRevenue ?? 0)}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Gross payments recorded today
              </p>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 113, 227, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
        </Card>

        {/* KPI 3: Ready for Pickup */}
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ready for Pickup
              </span>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {kpis.readyForPickup ?? 0}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Finished repairs awaiting collection
              </p>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(52, 199, 89, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
            }}>
              <PackageCheck size={20} />
            </div>
          </div>
        </Card>

        {/* KPI 4: Pending Approvals */}
        <Card
          style={{
            padding: 'var(--space-5)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            border: kpis.pendingApprovals > 0 ? '1.5px solid var(--color-warning)' : 'var(--card-border)',
          }}
          onClick={() => navigate('/owner/approvals')}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pending Approvals
                </span>
                {kpis.pendingApprovals > 0 && (
                  <Badge variant="warning" size="sm">Action Needed</Badge>
                )}
              </div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: kpis.pendingApprovals > 0 ? 'var(--color-warning)' : 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {kpis.pendingApprovals ?? 0}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Out-of-band quotes & overrides
              </p>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: kpis.pendingApprovals > 0 ? 'rgba(255, 149, 0, 0.12)' : 'var(--color-surface-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: kpis.pendingApprovals > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)',
            }}>
              <ShieldAlert size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Action Shortcuts */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        overflowX: 'auto',
        paddingBottom: 'var(--space-1)',
      }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/owner/approvals')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <ShieldAlert size={14} style={{ marginRight: '6px' }} />
          Review Approvals ({kpis.pendingApprovals || 0})
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/owner/jobs')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Layers size={14} style={{ marginRight: '6px' }} />
          All Jobs Oversight
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/owner/reconciliation')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Coins size={14} style={{ marginRight: '6px' }} />
          Daily Cash Close
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/owner/reports')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <FileText size={14} style={{ marginRight: '6px' }} />
          Analytics & SMS Volume
        </Button>
      </div>

      {/* Main Split Layout: Recent Jobs (Left) & Operational Summary (Right) */}
      <div className="responsive-split-2">
        {/* Left Column: Recent Jobs Table */}
        <Card style={{ overflow: 'hidden' }}>
          <div style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: 'var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)' }}>
                Recent Jobs
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Latest jobs registered and in progress
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/owner/jobs')}
            >
              View All <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </Button>
          </div>

          {recentJobs.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No recent jobs found.
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
                  }}>
                    <th style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600 }}>Job #</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Service</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Payment</th>
                    <th style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600, textAlign: 'right' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => navigate(`/owner/jobs?q=${encodeURIComponent(job.job_number)}`)}
                    >
                      <td style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600, color: 'var(--color-text)' }}>
                        <div>{job.job_number}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                          {job.shoe_brand} {job.shoe_color ? `(${job.shoe_color})` : ''}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{job.customer_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{job.customer_phone}</div>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text)' }}>
                        {job.service_name}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <StatusBadge status={job.status} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <PaymentBadge status={job.payment_status} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-5)', textAlign: 'right', fontWeight: 600, color: 'var(--color-text)' }}>
                        {formatKES(job.latest_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Right Column: Cash Drawer Status & Status Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Daily Cash Drawer Card */}
          <Card style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Coins size={18} color="var(--color-accent)" />
                Today's Cash Drawer
              </h3>
              {cashSummary.isClosed ? (
                <Badge variant="success" size="sm">
                  <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Closed
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  <Clock size={12} style={{ marginRight: '4px' }} /> Open
                </Badge>
              )}
            </div>

            <div style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Expected Cash from Drawer
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                {formatKES(cashSummary.expectedCashToday || 0)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Sum of cash payments minus reversals today
              </div>
            </div>

            {cashSummary.isClosed && cashSummary.dayClose ? (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                Physically Counted: <strong style={{ color: 'var(--color-text)' }}>{formatKES(cashSummary.dayClose.cash_counted)}</strong>
                <span style={{ margin: '0 8px' }}>•</span>
                Variance: <strong style={{ color: Number(cashSummary.dayClose.cash_counted) - Number(cashSummary.dayClose.cash_expected) < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {formatKES(Number(cashSummary.dayClose.cash_counted) - Number(cashSummary.dayClose.cash_expected))}
                </strong>
              </div>
            ) : null}

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => navigate('/owner/reconciliation')}
            >
              {cashSummary.isClosed ? 'Review Cash Reconciliation' : 'Perform Daily Cash Close'}
            </Button>
          </Card>

          {/* Job Status Distribution */}
          <Card style={{ padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>
              Workload by Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                'Registered',
                'In Queue',
                'Awaiting Confirmation',
                'Started',
                'On Hold',
                'Completed',
                'Picked',
              ].map((status) => {
                const count = statusCounts[status] || 0;
                const total = Math.max(1, kpis.activeJobs + (statusCounts['Picked'] || 0));
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={status}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{status}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{count}</span>
                    </div>
                    <div style={{
                      height: '6px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--color-border)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: status === 'Completed' ? 'var(--color-success)' : status === 'Awaiting Confirmation' ? 'var(--color-warning)' : 'var(--color-accent)',
                        borderRadius: '999px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
