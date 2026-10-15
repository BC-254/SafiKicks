import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paymentApi } from '../../api/payment.api';
import { receiptApi } from '../../api/receipt.api';
import { useAuthStore } from '../../store/authStore';
import {
  Card,
  Button,
  Input,
  StatusBadge,
  Badge,
  Modal,
  Spinner,
  PageSpinner,
  useToast,
} from '../../design-system';
import {
  Search,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const initialJobId = searchParams.get('jobId');

  const { user } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const { addToast } = useToast();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Active Job state
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [summary, setSummary] = useState(null);

  // Payment form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash'); // 'cash' | 'mpesa' | 'card'
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Reversal modal state
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversalAmount, setReversalAmount] = useState('');
  const [reversalReason, setReversalReason] = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);

  // Override modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Load Job summary
  const loadJobSummary = useCallback(async (jobId) => {
    try {
      setLoadingJob(true);
      const data = await paymentApi.getJobPayments(jobId);
      setSummary(data);
      // Pre-fill amount with balance due if positive
      if (data.balanceDue > 0) {
        setAmount(String(data.balanceDue));
      } else {
        setAmount('');
      }
    } catch (err) {
      addToast({
        title: 'Could not load payment ledger',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setLoadingJob(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedJobId) {
      loadJobSummary(selectedJobId);
    }
  }, [selectedJobId, loadJobSummary]);

  // Handle Search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery || searchQuery.trim().length < 2) {
      addToast({ title: 'Search query too short', message: 'Enter at least 2 characters.', type: 'warning' });
      return;
    }

    try {
      setSearching(true);
      const res = await receiptApi.lookupJobs(searchQuery);
      setSearchResults(res.jobs || []);
      if ((res.jobs || []).length === 0) {
        addToast({ title: 'No jobs found', message: 'Try searching with job number or customer phone.', type: 'info' });
      }
    } catch (err) {
      addToast({
        title: 'Search failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setSearching(false);
    }
  };

  // Submit Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      addToast({ title: 'Invalid amount', message: 'Please enter an amount greater than zero.', type: 'error' });
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await paymentApi.recordPayment({
        job_id: selectedJobId,
        amount: numAmount,
        method,
        reference,
        notes,
      });

      addToast({
        title: 'Payment Recorded',
        message: `KES ${numAmount.toLocaleString()} recorded via ${method.toUpperCase()}. New status: ${res.paymentStatus}`,
        type: 'success',
      });

      setReference('');
      setNotes('');
      loadJobSummary(selectedJobId);
    } catch (err) {
      addToast({
        title: 'Payment recording failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Submit Reversal
  const handleRecordReversal = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(reversalAmount);
    if (!reversalAmount || isNaN(numAmount) || numAmount <= 0) {
      addToast({ title: 'Invalid amount', message: 'Enter a valid reversal amount.', type: 'error' });
      return;
    }

    if (!reversalReason.trim()) {
      addToast({ title: 'Reason required', message: 'Please state the reason for this reversal.', type: 'warning' });
      return;
    }

    try {
      setSubmittingReversal(true);
      await paymentApi.recordReversal({
        job_id: selectedJobId,
        amount: numAmount,
        reason: reversalReason,
      });

      addToast({
        title: 'Reversal Recorded',
        message: `KES ${numAmount.toLocaleString()} reversed. Reason logged in audit.`,
        type: 'success',
      });

      setReversalModalOpen(false);
      setReversalAmount('');
      setReversalReason('');
      loadJobSummary(selectedJobId);
    } catch (err) {
      addToast({
        title: 'Reversal failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setSubmittingReversal(false);
    }
  };

  // Submit Owner Override
  const handleApplyOverride = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      addToast({ title: 'Reason required', message: 'Please state why this override is being granted.', type: 'warning' });
      return;
    }

    try {
      setSubmittingOverride(true);
      await paymentApi.overridePayment({
        job_id: selectedJobId,
        reason: overrideReason,
      });

      addToast({
        title: 'Override Granted',
        message: 'Customer is now authorized to collect shoes without full payment.',
        type: 'success',
      });

      setOverrideModalOpen(false);
      setOverrideReason('');
      loadJobSummary(selectedJobId);
    } catch (err) {
      addToast({
        title: 'Override failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 'var(--space-12)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          letterSpacing: 'var(--letter-spacing-tight)',
          color: 'var(--color-text)',
        }}>
          Payment Ledger
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
          Search for a customer job to record cash, M-Pesa, or card payments and view ledger history.
        </p>
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search by Job # (e.g. SRJ-...), Customer Name, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <Button type="submit" variant="primary" loading={searching}>
            Find Job
          </Button>
        </form>

        {/* Search Results Dropdown/List */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-separator)',
            paddingTop: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            maxHeight: 240,
            overflowY: 'auto',
          }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              Select Job to Record Payment:
            </div>
            {searchResults.map((j) => (
              <div
                key={j.id}
                onClick={() => {
                  setSelectedJobId(j.id);
                  setSearchResults([]);
                  setSearchQuery(j.job_number);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: selectedJobId === j.id ? 'var(--color-surface-sunken)' : 'transparent',
                  cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-xs)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{j.job_number}</strong>
                  <span style={{ marginLeft: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                    {j.customer_name} ({j.customer_phone})
                  </span>
                  <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-tertiary)' }}>
                    · {j.service_name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <StatusBadge status={j.status} size="sm" />
                  <Badge variant={j.payment_status === 'Paid' ? 'success' : 'neutral'}>
                    {j.payment_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Main Payment Section */}
      {loadingJob ? (
        <PageSpinner />
      ) : summary ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Financial Summary Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                    {summary.job?.job_number}
                  </span>
                  <Badge variant={
                    summary.paymentStatus === 'Paid' ? 'success' :
                    summary.paymentStatus === 'Part-paid' ? 'warning' : 'neutral'
                  }>
                    {summary.paymentStatus}
                  </Badge>
                  <StatusBadge status={summary.job?.status} size="sm" />
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                  Customer: <strong>{summary.job?.customer_name}</strong> · Phone: {summary.job?.customer_phone} · Service: {summary.job?.service_name}
                </div>
              </div>

              {isOwner && summary.balanceDue > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setOverrideModalOpen(true)}
                  icon={<ShieldAlert size={14} />}
                >
                  Grant Payment Override
                </Button>
              )}
            </div>

            {/* 3 Metric Pills */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  Agreed Total Quote
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)', marginTop: 2 }}>
                  KES {summary.agreedPrice.toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  Total Collected
                </div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)', marginTop: 2 }}>
                  KES {summary.totalPaid.toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                  Outstanding Balance Due
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: summary.balanceDue > 0 ? 'var(--color-danger)' : 'var(--color-text)',
                  marginTop: 2,
                }}>
                  KES {summary.balanceDue.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>

          {/* Record Tender Form */}
          {summary.balanceDue > 0 ? (
            <Card>
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
                Record Customer Tender
              </h2>

              <form onSubmit={handleRecordPayment}>
                {/* Method selector */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
                    Payment Method
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button
                      type="button"
                      variant={method === 'cash' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setMethod('cash')}
                      icon={<Banknote size={14} />}
                    >
                      Cash
                    </Button>
                    <Button
                      type="button"
                      variant={method === 'mpesa' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setMethod('mpesa')}
                      icon={<Smartphone size={14} />}
                    >
                      M-Pesa
                    </Button>
                    <Button
                      type="button"
                      variant={method === 'card' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setMethod('card')}
                      icon={<CreditCard size={14} />}
                    >
                      Credit/Debit Card
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <Input
                      label="Amount Paid (KES)"
                      type="number"
                      step="1"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Max: ${summary.balanceDue}`}
                      required
                    />
                    {summary.balanceDue > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setAmount(String(summary.balanceDue))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-accent)',
                            fontSize: 'var(--font-size-xs)',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Auto-fill full balance (KES {summary.balanceDue.toLocaleString()})
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Input
                      label={
                        method === 'mpesa' ? 'M-Pesa Confirmation Code' :
                        method === 'card' ? 'Card Transaction Ref' :
                        'Payment Reference / Receipt #'
                      }
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={method === 'mpesa' ? 'e.g. QHK719920' : 'Optional reference'}
                      required={method === 'mpesa'}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <Input
                    label="Staff Note (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Received at front counter with change returned"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submittingPayment}
                    icon={<DollarSign size={16} />}
                  >
                    Confirm & Record Payment (KES {parseFloat(amount || 0).toLocaleString()})
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card style={{ backgroundColor: 'var(--color-surface-sunken)', textAlign: 'center', padding: 'var(--space-6)' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-2) auto' }} />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Account Fully Settled
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
                This job has no outstanding balance. When work is completed, customer may request their pickup code.
              </p>
            </Card>
          )}

          {/* Ledger History Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={18} style={{ color: 'var(--color-text-secondary)' }} />
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Transaction History ({summary.ledger?.length || 0})
                </h2>
              </div>
            </div>

            {(!summary.ledger || summary.ledger.length === 0) ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--space-6)' }}>
                No payment transactions recorded yet for this job.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {summary.ledger.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3)',
                      backgroundColor: 'var(--color-surface-sunken)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{
                          fontWeight: 'var(--font-weight-bold)',
                          color: item.type === 'payment' ? 'var(--color-success)' : 'var(--color-danger)',
                        }}>
                          {item.type === 'payment' ? '+' : '-'} KES {parseFloat(item.amount).toLocaleString()}
                        </span>
                        <Badge variant={item.type === 'payment' ? 'neutral' : 'danger'}>
                          {item.method.toUpperCase()}
                        </Badge>
                        {item.reference && (
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                            Ref: {item.reference}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · Received by {item.received_by_name}
                        {item.notes && <span> · Note: {item.notes}</span>}
                      </div>
                    </div>

                    {isOwner && item.type === 'payment' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReversalAmount(item.amount);
                          setReversalModalOpen(true);
                        }}
                        icon={<RotateCcw size={12} />}
                      >
                        Reverse
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <DollarSign size={40} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-3) auto' }} />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
            No Job Selected
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', maxWidth: 360, margin: '4px auto 0 auto' }}>
            Use the search box above to find a job by job number, customer name, or phone number to view the ledger and accept payment.
          </p>
        </Card>
      )}

      {/* Payment Reversal Modal (Owner Only) */}
      <Modal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        title="Execute Payment Reversal"
      >
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
          Reversing a payment will adjust the job's balance and payment status. This action is recorded permanently in the audit trail.
        </p>

        <form onSubmit={handleRecordReversal}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Input
              label="Reversal Amount (KES)"
              type="number"
              step="1"
              value={reversalAmount}
              onChange={(e) => setReversalAmount(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Input
              label="Mandatory Reason for Reversal"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="e.g. Accidental double entry or refunded cash"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => setReversalModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={submittingReversal}
            >
              Confirm Reversal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Override Modal (Owner Only) */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Grant Payment Override for Pickup"
      >
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
          Authorizing this override permits the customer to receive their OTP and collect their shoes despite an unpaid balance of <strong>KES {summary?.balanceDue?.toLocaleString()}</strong>.
        </p>

        <form onSubmit={handleApplyOverride}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Input
              label="Reason for Payment Override"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Trusted corporate account or owner pre-approved courtesy release"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submittingOverride}
            >
              Approve Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
