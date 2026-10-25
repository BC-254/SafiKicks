import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registrationApi } from '../../api/registration.api';
import { catalogApi } from '../../api/catalog.api';
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  OtpInput,
  useToast,
  Badge,
} from '../../design-system';
import { formatPriceRange } from '../../utils/formatters';
import {
  Phone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  ArrowLeft,
  Info,
} from 'lucide-react';

export function RegisterPage() {
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: details, 4: success
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneSessionToken, setPhoneSessionToken] = useState('');
  const [devCode, setDevCode] = useState('');

  // Step 3 details
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [shoeBrand, setShoeBrand] = useState('');
  const [shoeColor, setShoeColor] = useState('');
  const [notes, setNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);

  // Success state
  const [createdJob, setCreatedJob] = useState(null);

  // Resend timer
  const [resendTimer, setResendTimer] = useState(60);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    catalogApi.getActiveServices()
      .then((data) => {
        setServices(data.services || []);
        if (data.services?.length > 0) {
          setServiceId(data.services[0].id);
        }
      })
      .catch(() => toast.error('Could not load service list.'));
  }, []);

  useEffect(() => {
    let interval = null;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const selectedService = services.find((s) => s.id === serviceId);

  // Step 1: Request Phone Verification Code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Please enter your phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await registrationApi.verifyPhone(phone);
      if (res.devCode) setDevCode(res.devCode);
      setStep(2);
      setResendTimer(60);
      toast.info('Verification code sent via SMS.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm OTP
  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await registrationApi.confirmPhone(phone, otpCode);
      setPhoneSessionToken(res.phoneSessionToken);
      setStep(3);
      toast.success('Phone verified!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Register Job
  const handleRegisterJob = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!serviceId) {
      toast.error('Please select a service.');
      return;
    }
    if (!consentGiven) {
      toast.error('Please accept the privacy terms to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await registrationApi.registerJob({
        name,
        service_id: serviceId,
        shoe_brand: shoeBrand,
        shoe_color: shoeColor,
        notes,
        consent_given: consentGiven,
      }, phoneSessionToken);

      setCreatedJob(res);
      setStep(4);
      toast.success('Registration completed!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ── STEP 1: PHONE INPUT ───────────────────────────────── */}
      {step === 1 && (
        <Card style={{ padding: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
              Drop Off Shoes
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
              Enter your mobile number to verify your repair registration.
            </p>
          </div>

          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              hint="We will send a one-time verification code via SMS."
              required
              autoFocus
            />

            <Button type="submit" variant="primary" size="lg" block loading={loading}>
              Send Verification Code <ArrowRight size={16} />
            </Button>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-6)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface-secondary)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
          }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <span>No password needed. Your phone number is your secure identifier.</span>
          </div>
        </Card>
      )}

      {/* ── STEP 2: ENTER OTP ─────────────────────────────────── */}
      {step === 2 && (
        <Card style={{ padding: 'var(--space-8)' }}>
          <button
            onClick={() => setStep(1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-4)',
              padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Change Number
          </button>

          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
              Enter Code
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
              We sent a 6-digit code to <strong>{phone}</strong>
            </p>
          </div>

          {devCode && (
            <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)', textAlign: 'center' }}>
              <Info size={16} />
              <span><strong>Dev Mode Code:</strong> {devCode}</span>
            </div>
          )}

          <form onSubmit={handleConfirmOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <OtpInput
              value={otpCode}
              onChange={(val) => setOtpCode(val)}
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={loading}
              disabled={otpCode.length < 6}
            >
              Verify & Continue
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
            {resendTimer > 0 ? (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                Resend code in {resendTimer}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestOtp}
                className="btn btn-ghost btn-sm"
              >
                Resend Code via SMS
              </button>
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 3: DETAILS FORM ─────────────────────────────── */}
      {step === 3 && (
        <Card style={{ padding: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
              Shoe & Service Details
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
              Verified: <strong>{phone}</strong>
            </p>
          </div>

          <form onSubmit={handleRegisterJob} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Your Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <Select
              label="Select Service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatPriceRange(s.min_price, s.max_price)})
                </option>
              ))}
            </Select>

            {/* Price Indicator Notice */}
            {selectedService && (
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Indicative Catalog Price:
                </div>
                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                  {formatPriceRange(selectedService.min_price, selectedService.max_price)}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  * Final quote is proposed by a technician after inspection and requires your confirmation before work begins.
                </div>
              </div>
            )}

            <div className="form-grid">
              <Input
                label="Shoe Brand (optional)"
                value={shoeBrand}
                onChange={(e) => setShoeBrand(e.target.value)}
                placeholder="e.g. Nike, Jordan, Clark's"
              />
              <Input
                label="Shoe Color (optional)"
                value={shoeColor}
                onChange={(e) => setShoeColor(e.target.value)}
                placeholder="e.g. White, Black, Brown"
              />
            </div>

            <Textarea
              label="Special Notes or Issues (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken sole on right shoe, stain on heel"
              rows={2}
            />

            {/* Privacy Notice and Consent */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)',
            }}>
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--color-accent)' }}
                required
              />
              <label htmlFor="consentCheck" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                I agree to Safi Kicks collecting my name, phone number, and intake photos for repair tracking, quote confirmations, and secure release verification.
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={loading}
              style={{ marginTop: 'var(--space-3)' }}
            >
              Submit Registration
            </Button>
          </form>
        </Card>
      )}

      {/* ── STEP 4: SUCCESS VIEW ──────────────────────────────── */}
      {step === 4 && createdJob && (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--status-completed-bg)',
            color: 'var(--status-completed-text)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-4)',
          }}>
            <CheckCircle2 size={32} />
          </div>

          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
            Registration Confirmed
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Please present this job number when dropping off your shoes at the counter.
          </p>

          <div style={{
            margin: 'var(--space-6) 0',
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wider)' }}>
              Your Job Number
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginTop: 4 }}>
              {createdJob.jobNumber}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Clock size={12} /> Bring shoes within 48 hours to avoid registration expiry
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => navigate(createdJob.trackingUrl)}
            >
              View Live Job Status <ArrowRight size={16} />
            </Button>

            <Button
              variant="secondary"
              block
              onClick={() => {
                setStep(1);
                setPhone('');
                setOtpCode('');
                setCreatedJob(null);
              }}
            >
              Register Another Pair
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
