import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { repairerApi } from '../../api/repairer.api';
import { Card, Button, StatusBadge, Badge, PageSpinner, useToast } from '../../design-system';
import { Wrench, CheckCircle2, Clock, AlertCircle, RefreshCw, ArrowUpRight } from 'lucide-react';

export function MyActivityPage() {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const { addToast } = useToast();

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      const data = await repairerApi.getActivity();
      setActivity(data);
    } catch (err) {
      addToast({
        title: 'Failed to load activity',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (loading && !activity) {
    return <PageSpinner />;
  }

  const stats = activity?.stats || {};
  const recentJobs = activity?.recentJobs || [];

  const filteredJobs = recentJobs.filter((j) => {
    if (filter === 'IN_PROGRESS') return j.status === 'Started';
    if (filter === 'COMPLETED') return j.status === 'Completed' || j.status === 'Picked';
    return true;
  });

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 'var(--space-12)' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text)',
          }}>
            My Repair Activity
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Performance overview, jobs claimed, and completion turnaround.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchActivity}
          loading={loading}
          icon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}>
        <Card style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
            In Progress Work
          </div>
          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            marginTop: 'var(--space-2)',
          }}>
            {stats.in_progress_count || 0}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Active on bench
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
            Completed Today
          </div>
          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-success)',
            marginTop: 'var(--space-2)',
          }}>
            {stats.completed_today || 0}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Ready for customer collection
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
            Completed This Week
          </div>
          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            marginTop: 'var(--space-2)',
          }}>
            {stats.completed_this_week || 0}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Last 7 days turnaround
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
            Total Lifetime Completed
          </div>
          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            marginTop: 'var(--space-2)',
          }}>
            {stats.total_completed || 0}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Across all services
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Recent Jobs */}
      <Card>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
            Recent Assigned Jobs
          </h2>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant={filter === 'ALL' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('ALL')}
            >
              All Recent
            </Button>
            <Button
              variant={filter === 'IN_PROGRESS' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('IN_PROGRESS')}
            >
              In Progress
            </Button>
            <Button
              variant={filter === 'COMPLETED' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('COMPLETED')}
            >
              Completed
            </Button>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            No jobs found in this category.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {filteredJobs.map((j) => (
              <Link
                key={j.id}
                to={`/repairer/jobs/${j.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-sunken)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)' }}>
                      {j.job_number}
                    </span>
                    <Badge variant="neutral">{j.service_name}</Badge>
                    <StatusBadge status={j.status} size="sm" />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    {j.shoe_brand} · {j.shoe_color || 'Default'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  {j.agreed_price && (
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                      KES {parseFloat(j.agreed_price).toLocaleString()}
                    </span>
                  )}
                  <ArrowUpRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
