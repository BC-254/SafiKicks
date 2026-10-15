import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { pricingApi } from '../../api/pricing.api';
import {
  Card,
  Button,
  StatusBadge,
  Badge,
  Modal,
  PageSpinner,
  useToast,
} from '../../design-system';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export function PriceConfirmPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [responding, setResponding] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [resultState, setResultState] = useState(null); // 'confirmed' | 'declined'

  const fetchProposal = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pricingApi.getPriceProposal(token);
      setData(res);
      if (res.job.status === 'Started') {
        setResultState('confirmed');
      } else if (res.job.status === 'Cancelled') {
        setResultState('declined');
      }
    } catch (err) {
      addToast({
        title: 'Quote unavailable',
        message: err.response?.data?.error || 'Invalid or expired repair quote link.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const handleConfirm = async () => {
    try {
      setResponding(true);
      const res = await pricingApi.confirmPrice(token);
      setResultState('confirmed');
      addToast({
        title: 'Quote Confirmed',
        message: 'Your repair has begun! You can track progress in real-time.',
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Confirmation failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    try {
      setResponding(true);
      const res = await pricingApi.declinePrice(token);
      setResultState('declined');
      setDeclineModalOpen(false);
      addToast({
        title: 'Quote Declined',
        message: 'Your repair order has been cancelled.',
        type: 'info',
      });
    } catch (err) {
      addToast({
        title: 'Action failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (!data || !data.price) {
    return (
      <div style={{ maxWidth: 440, margin: 'var(--space-8) auto', textAlign: 'center' }}>
        <Card style={{ padding: 'var(--space-8)' }}>
          <Clock size={40} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }} />
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
            Quote Under Preparation
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
            Our craftsmen are currently inspecting your shoes. You will receive an SMS as soon as the quote is ready for your confirmation.
          </p>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Link to={`/job/${token}`} style={{ textDecoration: 'none' }}>
              <Button variant="secondary" fullWidth>
                Back to Tracking
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { job, price, canRespond } = data;
  const formattedAmount = parseFloat(price.amount).toLocaleString();

  // Confirmed State
  if (resultState === 'confirmed') {
    return (
      <div style={{ maxWidth: 440, margin: 'var(--space-8) auto' }}>
        <Card style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4) auto',
            color: 'var(--color-success)',
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)' }}>
            Repair Authorized
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Agreed Quote: <strong>KES {formattedAmount}</strong>
          </p>

          <div style={{
            margin: 'var(--space-6) 0',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'left',
            fontSize: 'var(--font-size-xs)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Job Number:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{job.job_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Service:</span>
              <span>{job.service_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
              <StatusBadge status="Started" size="sm" />
            </div>
          </div>

          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-6)' }}>
            Our repairers are working on your shoes now. You'll receive an SMS when they are ready for pickup.
          </p>

          <Link to={`/job/${token}`} style={{ textDecoration: 'none' }}>
            <Button variant="primary" fullWidth icon={<ArrowRight size={16} />}>
              View Live Repair Status
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Declined State
  if (resultState === 'declined') {
    return (
      <div style={{ maxWidth: 440, margin: 'var(--space-8) auto' }}>
        <Card style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'var(--color-surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4) auto',
            color: 'var(--color-danger)',
          }}>
            <XCircle size={36} />
          </div>

          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)' }}>
            Quote Declined
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Order <strong>{job.job_number}</strong> has been cancelled.
          </p>

          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', margin: 'var(--space-6) 0' }}>
            No charges have been applied. Please visit the shop counter at your earliest convenience to collect your shoes.
          </p>

          <Link to={`/job/${token}`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" fullWidth>
              View Order Details
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460, margin: 'var(--space-4) auto var(--space-12) auto', padding: '0 var(--space-2)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <Badge variant="primary" style={{ marginBottom: 'var(--space-2)' }}>
          Repair Quote Ready
        </Badge>
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          letterSpacing: 'var(--letter-spacing-tight)',
          color: 'var(--color-text)',
        }}>
          Review & Confirm
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
          Job <strong style={{ fontFamily: 'var(--font-mono)' }}>{job.job_number}</strong>
        </p>
      </div>

      <Card style={{ padding: 'var(--space-6)' }}>
        {/* Prominent Price Display */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-6) var(--space-4)',
          backgroundColor: 'var(--color-surface-sunken)',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Quoted Price
          </div>
          <div style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            letterSpacing: 'var(--letter-spacing-tight)',
            marginTop: 4,
          }}>
            KES {formattedAmount}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Payable upon collection · No upfront deposit required
          </div>
        </div>

        {/* Breakdown Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-separator)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Service:</span>
            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{job.service_name}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-separator)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Footwear:</span>
            <span>{job.shoe_brand || 'Standard'} {job.shoe_color ? `· ${job.shoe_color}` : ''}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-separator)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Catalog Range:</span>
            <span>KES {parseFloat(job.catalog_min_price).toLocaleString()} – {job.catalog_max_price ? parseFloat(job.catalog_max_price).toLocaleString() : 'Open'}</span>
          </div>
        </div>

        {/* Security guarantee */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3)',
          backgroundColor: 'var(--color-surface-sunken)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
        }}>
          <ShieldCheck size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <span>
            Quality guaranteed. Work begins immediately upon your confirmation.
          </span>
        </div>

        {/* Actions */}
        {canRespond ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleConfirm}
              loading={responding}
            >
              Confirm & Authorize Repair (KES {formattedAmount})
            </Button>

            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setDeclineModalOpen(true)}
              disabled={responding}
            >
              Decline Quote
            </Button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
            This quote is no longer awaiting response (Current Status: {job.status}).
          </div>
        )}
      </Card>

      {/* Decline Confirmation Modal */}
      <Modal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        title="Decline Repair Quote?"
      >
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
          If you decline, repair work will not take place and order <strong>{job.job_number}</strong> will be cancelled. You can pick up your shoes from our shop anytime.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={() => setDeclineModalOpen(false)}>
            Keep Order
          </Button>
          <Button
            variant="danger"
            onClick={handleDecline}
            loading={responding}
          >
            Yes, Decline Quote
          </Button>
        </div>
      </Modal>
    </div>
  );
}
