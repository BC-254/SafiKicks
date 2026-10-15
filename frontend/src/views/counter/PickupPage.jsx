import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { pickupApi } from '../../api/pickup.api';
import { receiptApi } from '../../api/receipt.api';
import {
  Card,
  Button,
  Input,
  OtpInput,
  StatusBadge,
  Badge,
  PageSpinner,
  useToast,
} from '../../design-system';
import {
  Search,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

export function PickupPage() {
  const [searchParams] = useSearchParams();
  const initialJobId = searchParams.get('jobId');

  const { addToast } = useToast();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Active Job state
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [pickupData, setPickupData] = useState(null);

  // OTP form state
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [pickupSuccess, setPickupSuccess] = useState(false);

  const loadPickupStatus = useCallback(async (jobId) => {
    try {
      setLoadingStatus(true);
      const data = await pickupApi.getPickupStatus(jobId);
      setPickupData(data);
      if (data.job?.status === 'Picked') {
        setPickupSuccess(true);
      }
    } catch (err) {
      addToast({
        title: 'Could not load job',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setLoadingStatus(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedJobId) {
      loadPickupStatus(selectedJobId);
    }
  }, [selectedJobId, loadPickupStatus]);

  // Handle Search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery || searchQuery.trim().length < 2) {
      addToast({ title: 'Query too short', message: 'Enter at least 2 characters.', type: 'warning' });
      return;
    }

    try {
      setSearching(true);
      const res = await receiptApi.lookupJobs(searchQuery);
      setSearchResults(res.jobs || []);
      if ((res.jobs || []).length === 0) {
        addToast({ title: 'No jobs found', message: 'Try searching with job number or phone.', type: 'info' });
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

  // Handle Verify OTP
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length !== 6) {
      addToast({ title: 'Incomplete code', message: 'Please enter all 6 digits.', type: 'warning' });
      return;
    }

    try {
      setVerifying(true);
      const res = await pickupApi.verifyPickupCode(selectedJobId, otp);
      setPickupSuccess(true);
      addToast({
        title: 'OTP Verified',
        message: 'Shoes successfully released to customer!',
        type: 'success',
      });
      loadPickupStatus(selectedJobId);
    } catch (err) {
      const data = err.response?.data;
      addToast({
        title: 'Verification failed',
        message: data?.error || err.message,
        type: 'error',
      });
      setOtp('');
      loadPickupStatus(selectedJobId);
    } finally {
      setVerifying(false);
    }
  };

  // Handle Re-send / Re-issue Code
  const handleResendCode = async () => {
    try {
      setResending(true);
      const res = await pickupApi.requestNewCode(selectedJobId);
      addToast({
        title: 'New Code Sent',
        message: res.message,
        type: 'success',
      });
      setOtp('');
      loadPickupStatus(selectedJobId);
    } catch (err) {
      addToast({
        title: 'Could not send code',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 'var(--space-12)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          letterSpacing: 'var(--letter-spacing-tight)',
          color: 'var(--color-text)',
        }}>
          Release Shoes (OTP)
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
          Customer presents the 6-digit code received via SMS to verify collection authority.
        </p>
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search Job # (e.g. SRJ-...), Customer Name, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <Button type="submit" variant="primary" loading={searching}>
            Find Job
          </Button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-separator)',
            paddingTop: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            maxHeight: 200,
            overflowY: 'auto',
          }}>
            {searchResults.map((j) => (
              <div
                key={j.id}
                onClick={() => {
                  setSelectedJobId(j.id);
                  setSearchResults([]);
                  setSearchQuery(j.job_number);
                  setPickupSuccess(false);
                  setOtp('');
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
                }}
              >
                <div>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{j.job_number}</strong>
                  <span style={{ marginLeft: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                    {j.customer_name} ({j.customer_phone})
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

      {/* Main Pickup Body */}
      {loadingStatus ? (
        <PageSpinner />
      ) : pickupData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Job Overview Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                    {pickupData.job?.job_number}
                  </span>
                  <StatusBadge status={pickupData.job?.status} size="sm" />
                  <Badge variant={pickupData.job?.payment_status === 'Paid' ? 'success' : 'neutral'}>
                    {pickupData.job?.payment_status}
                  </Badge>
                  {pickupData.hasPaymentOverride && (
                    <Badge variant="warning">Owner Override</Badge>
                  )}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                  Customer: <strong>{pickupData.job?.customer_name}</strong> · Footwear: {pickupData.job?.shoe_brand} ({pickupData.job?.shoe_color})
                </div>
              </div>
            </div>

            {/* Check Release Preconditions */}
            {pickupSuccess || pickupData.job?.status === 'Picked' ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-8) var(--space-4)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <CheckCircle2 size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-3) auto' }} />
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  Shoes Released
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
                  Pickup verification confirmed. Job is now in Picked status.
                </p>
              </div>
            ) : !pickupData.isEligibleForPickup ? (
              <div style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-xs)',
                lineHeight: 1.6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-warning)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 4 }}>
                  <AlertTriangle size={16} />
                  <span>Release Preconditions Not Met</span>
                </div>
                {pickupData.job?.status !== 'Completed' && (
                  <div>• Repair work is not completed yet (Current Status: <strong>{pickupData.job?.status}</strong>).</div>
                )}
                {pickupData.job?.payment_status !== 'Paid' && !pickupData.hasPaymentOverride && (
                  <div>
                    • Payment is outstanding (Status: <strong>{pickupData.job?.payment_status}</strong>).{' '}
                    <Link to={`/counter/payment?jobId=${selectedJobId}`} style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-semibold)' }}>
                      Record payment now →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Verification Form */
              <div style={{ marginTop: 'var(--space-2)' }}>
                {pickupData.isLocked ? (
                  <div style={{
                    padding: 'var(--space-4)',
                    backgroundColor: 'var(--color-danger-subtle)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text)',
                  }}>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
                      Pickup Code Locked
                    </div>
                    <div style={{ marginTop: 4 }}>
                      3 incorrect attempts have been made. Please click below to generate and send a new code to the customer's phone.
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-4)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                  }}>
                    <span>
                      Enter the 6-digit code presented by customer:
                    </span>
                    <span>
                      Attempts made: <strong>{pickupData.attempts}/3</strong>
                    </span>
                  </div>
                )}

                <form onSubmit={handleVerify}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      numInputs={6}
                      disabled={pickupData.isLocked || verifying}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendCode}
                      loading={resending}
                      icon={<RefreshCw size={14} />}
                    >
                      Resend / Issue New Code
                    </Button>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={otp.length !== 6 || pickupData.isLocked}
                      loading={verifying}
                      icon={<KeyRound size={16} />}
                    >
                      Verify & Release Shoes
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <KeyRound size={40} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-3) auto' }} />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
            No Job Selected
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', maxWidth: 360, margin: '4px auto 0 auto' }}>
            Search for a completed job above to verify customer OTP and authorize shoe collection.
          </p>
        </Card>
      )}
    </div>
  );
}
