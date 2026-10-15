import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { repairerApi } from '../../api/repairer.api';
import { Card, Button, Badge, PageSpinner, useToast } from '../../design-system';
import { Wrench, Clock, ArrowRight, RefreshCw, Tag, Camera, CheckCircle2 } from 'lucide-react';

export function QueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await repairerApi.getQueue();
      setQueue(data.queue || []);
    } catch (err) {
      addToast({
        title: 'Failed to load queue',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleClaim = async (job) => {
    try {
      setClaimingId(job.id);
      const res = await repairerApi.claimJob(job.id);
      addToast({
        title: 'Job Claimed',
        message: `${job.job_number} assigned to you. Opening job inspection...`,
        type: 'success',
      });
      // Navigate to job detail for pricing & inspection
      navigate(`/repairer/jobs/${job.id}`);
    } catch (err) {
      addToast({
        title: 'Could not claim job',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
      // Refresh queue in case someone else claimed it concurrently
      fetchQueue();
    } finally {
      setClaimingId(null);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' +
      date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading && queue.length === 0) {
    return <PageSpinner />;
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              letterSpacing: 'var(--letter-spacing-tight)',
              color: 'var(--color-text)',
            }}>
              Repair Queue
            </h1>
            <Badge variant="neutral">
              {queue.length} {queue.length === 1 ? 'job waiting' : 'jobs waiting'}
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Unassigned intake jobs awaiting claim, inspection and pricing (FIFO priority).
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchQueue}
          loading={loading}
          icon={<RefreshCw size={14} />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Queue items */}
      {queue.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4) auto',
            color: 'var(--color-text-tertiary)',
          }}>
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 4 }}>
            Queue is All Clear
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', maxWidth: 380, margin: '0 auto' }}>
            There are currently no unassigned jobs in queue. New jobs will appear here automatically when checked in at the counter.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {queue.map((job) => (
            <Card
              key={job.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text)',
                    }}>
                      {job.job_number}
                    </span>
                    <Badge variant="primary">{job.service_name}</Badge>
                    {job.receipt_photo_count > 0 && (
                      <Badge variant="neutral" icon={<Camera size={12} />}>
                        {job.receipt_photo_count} photo{job.receipt_photo_count > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <h3 style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    marginTop: 'var(--space-2)',
                    color: 'var(--color-text)',
                  }}>
                    {job.shoe_brand || 'Unspecified'} {job.shoe_color ? `· ${job.shoe_color}` : ''}
                  </h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    <Clock size={12} />
                    <span>Received {formatTime(job.received_at || job.registered_at)}</span>
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                    marginTop: 4,
                  }}>
                    Catalog: KES {parseFloat(job.catalog_min_price).toLocaleString()}
                    {job.catalog_max_price ? ` – ${parseFloat(job.catalog_max_price).toLocaleString()}` : '+'}
                  </div>
                </div>
              </div>

              {/* Customer & Notes detail */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--color-separator)',
              }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  <span>Customer: <strong>{job.customer_first_name || 'Walk-in'}</strong></span>
                  {job.notes && (
                    <span style={{ marginLeft: 'var(--space-3)', color: 'var(--color-text-tertiary)' }}>
                      Note: {job.notes.split('\n')[0].substring(0, 60)}{job.notes.length > 60 ? '...' : ''}
                    </span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleClaim(job)}
                  loading={claimingId === job.id}
                  icon={<ArrowRight size={14} />}
                >
                  Claim Job
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
