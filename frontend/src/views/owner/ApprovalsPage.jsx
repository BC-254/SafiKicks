import React, { useState, useEffect, useCallback } from 'react';
import { approvalApi } from '../../api/approval.api';
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  PageSpinner,
  useToast,
} from '../../design-system';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  DollarSign,
  UserCheck,
  FileText,
} from 'lucide-react';

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const { addToast } = useToast();

  // Decision state
  const [decidingId, setDecidingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeApproval, setActiveApproval] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await approvalApi.getPendingApprovals(typeFilter || null);
      setApprovals(res.approvals || []);
    } catch (err) {
      addToast({
        title: 'Could not load approvals',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, addToast]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (approval) => {
    try {
      setDecidingId(approval.id);
      await approvalApi.decideApproval(approval.id, {
        decision: 'approved',
      });

      addToast({
        title: 'Request Approved',
        message: `Approved ${approval.type.replace(/_/g, ' ')} for Job ${approval.job_number}.`,
        type: 'success',
      });

      fetchApprovals();
    } catch (err) {
      addToast({
        title: 'Approval failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setDecidingId(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      addToast({ title: 'Reason required', message: 'Please provide a reason for rejection.', type: 'warning' });
      return;
    }

    try {
      setSubmittingReject(true);
      await approvalApi.decideApproval(activeApproval.id, {
        decision: 'rejected',
        reason: rejectReason,
      });

      addToast({
        title: 'Request Rejected',
        message: `Rejected request for Job ${activeApproval.job_number}. Reason recorded in audit.`,
        type: 'info',
      });

      setRejectModalOpen(false);
      setRejectReason('');
      setActiveApproval(null);
      fetchApprovals();
    } catch (err) {
      addToast({
        title: 'Rejection failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setSubmittingReject(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'out_of_band_price':
        return <Badge variant="warning">Out-of-Band Price</Badge>;
      case 'pickup_override':
        return <Badge variant="danger">Pickup Override</Badge>;
      case 'alternate_identifier':
        return <Badge variant="neutral">Alternate ID</Badge>;
      default:
        return <Badge variant="neutral">{type.replace(/_/g, ' ')}</Badge>;
    }
  };

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
              Owner Approvals
            </h1>
            <Badge variant={approvals.length > 0 ? 'warning' : 'neutral'}>
              {approvals.length} pending
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Review out-of-band price proposals, payment overrides, and exceptions before execution.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchApprovals}
          loading={loading}
          icon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <Button
          variant={typeFilter === '' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setTypeFilter('')}
        >
          All Requests
        </Button>
        <Button
          variant={typeFilter === 'out_of_band_price' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setTypeFilter('out_of_band_price')}
        >
          Out-of-Band Prices
        </Button>
        <Button
          variant={typeFilter === 'pickup_override' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setTypeFilter('pickup_override')}
        >
          Pickup Overrides
        </Button>
      </div>

      {/* Approvals List */}
      {loading && approvals.length === 0 ? (
        <PageSpinner />
      ) : approvals.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <ShieldCheck size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-3) auto' }} />
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
            All Clear — Zero Pending Approvals
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', maxWidth: 360, margin: '4px auto 0 auto' }}>
            There are no operational exceptions or out-of-band quotes awaiting your decision.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {approvals.map((app) => (
            <Card key={app.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)' }}>
                      {app.job_number}
                    </span>
                    {getTypeBadge(app.type)}
                    <Badge variant="neutral">{app.service_name}</Badge>
                  </div>

                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)', marginTop: 4 }}>
                    Customer: {app.customer_name} ({app.customer_phone || 'No phone'}) · {app.shoe_brand} ({app.shoe_color || 'Default'})
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    <span>Requested {new Date(app.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(app.requested_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div style={{ marginTop: 2, color: 'var(--color-text-secondary)' }}>
                    By: <strong>{app.requested_by_name}</strong> ({app.requested_by_role})
                  </div>
                </div>
              </div>

              {/* Specific detail box */}
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                lineHeight: 1.5,
              }}>
                {app.type === 'out_of_band_price' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 4 }}>
                      <span>
                        Catalog Standard: <strong>KES {parseFloat(app.catalog_min_price).toLocaleString()} – {app.catalog_max_price ? parseFloat(app.catalog_max_price).toLocaleString() : 'Open'}</strong>
                      </span>
                      <span>
                        Proposed Quote: <strong style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>KES {parseFloat(app.proposed_amount).toLocaleString()}</strong>
                      </span>
                    </div>
                    {app.reason && <div><strong>Technician Note:</strong> {app.reason}</div>}
                  </div>
                ) : (
                  <div>
                    <strong>Reason for Request:</strong> {app.reason || 'None specified'}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 'var(--space-3)',
                paddingTop: 'var(--space-2)',
                borderTop: '1px solid var(--color-separator)',
              }}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setActiveApproval(app);
                    setRejectReason('');
                    setRejectModalOpen(true);
                  }}
                  disabled={decidingId === app.id}
                  icon={<XCircle size={14} />}
                >
                  Reject
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(app)}
                  loading={decidingId === app.id}
                  icon={<CheckCircle2 size={14} />}
                >
                  Approve Request
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Approval Request"
      >
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
          Please provide a reason for rejecting this request for Job <strong>{activeApproval?.job_number}</strong>. The requester will be notified via the audit log.
        </p>

        <form onSubmit={handleReject}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Input
              label="Mandatory Reason for Rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Price is excessive for standard shoe material; request re-assessment within band."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={submittingReject}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
