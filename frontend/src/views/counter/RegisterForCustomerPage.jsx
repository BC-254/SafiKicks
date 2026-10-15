import { useState, useEffect } from 'react';
import { catalogApi } from '../../api/catalog.api';
import { receiptApi } from '../../api/receipt.api';
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  useToast,
  Badge,
} from '../../design-system';
import { formatPriceRange } from '../../utils/formatters';
import { UserCheck, QrCode, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

export function RegisterForCustomerPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [hasNoPhone, setHasNoPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [alternateId, setAlternateId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [shoeBrand, setShoeBrand] = useState('');
  const [shoeColor, setShoeColor] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [markReceived, setMarkReceived] = useState(true);

  const toast = useToast();

  useEffect(() => {
    catalogApi.getActiveServices()
      .then((data) => {
        setServices(data.services || []);
        if (data.services?.length > 0) {
          setServiceId(data.services[0].id);
        }
      })
      .catch(() => toast.error('Failed to load catalog services.'));
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!hasNoPhone && !phone.trim()) {
      toast.error('Please enter customer phone number or check "No Phone".');
      return;
    }
    if (hasNoPhone && !alternateId.trim()) {
      toast.error('Please provide an alternate identifier (National ID, Driving License).');
      return;
    }
    if (!serviceId) {
      toast.error('Please select a service.');
      return;
    }

    try {
      setLoading(true);
      const res = await receiptApi.createStaffJob({
        name,
        phone: hasNoPhone ? null : phone,
        alternate_identifier: hasNoPhone ? alternateId : null,
        service_id: serviceId,
        shoe_brand: shoeBrand,
        shoe_color: shoeColor,
        pre_existing_damage: damageNotes,
        notes,
        mark_received: markReceived,
      });

      setCreatedJob(res.job);
      toast.success(`Job ${res.job.job_number} created!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create job.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreatedJob(null);
    setName('');
    setPhone('');
    setAlternateId('');
    setHasNoPhone(false);
    setShoeBrand('');
    setShoeColor('');
    setDamageNotes('');
    setNotes('');
  };

  if (createdJob) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
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

          <div style={{ display: 'inline-block', marginBottom: 'var(--space-2)' }}>
            <Badge variant="blue">Staff-Registered</Badge>
          </div>

          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
            Job Successfully Created
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Customer: <strong>{createdJob.customer_name}</strong>
          </p>

          <div style={{
            margin: 'var(--space-6) 0',
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              Assigned Job Number
            </div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginTop: 4 }}>
              {createdJob.job_number}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-info)', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <QrCode size={16} /> Fit waterproof barcode tag #{createdJob.job_number} to the shoes now
            </div>
          </div>

          <Button variant="primary" size="lg" block onClick={handleReset}>
            Register Another Walk-in Customer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
            Register Walk-in Customer
          </h1>
          <Badge variant="blue">Staff Assisted</Badge>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
          Create a job for customers who drop off in person without a smartphone.
        </p>
      </div>

      <Card style={{ padding: 'var(--space-8)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Customer Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          {!hasNoPhone ? (
            <Input
              label="Customer Mobile Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              required={!hasNoPhone}
            />
          ) : (
            <Input
              label="Alternate Identifier (ID / Passport / Student Card)"
              value={alternateId}
              onChange={(e) => setAlternateId(e.target.value)}
              hint="Required for customers without a phone (REG-08)."
              required
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: -6 }}>
            <input
              type="checkbox"
              id="noPhoneCheck"
              checked={hasNoPhone}
              onChange={(e) => setHasNoPhone(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <label htmlFor="noPhoneCheck" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Customer has no mobile phone (requires alternate ID)
            </label>
          </div>

          <Select
            label="Requested Service"
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

          {selectedService && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: -4 }}>
              Indicative price band: <strong>{formatPriceRange(selectedService.min_price, selectedService.max_price)}</strong>
            </div>
          )}

          <div className="form-grid">
            <Input
              label="Shoe Brand (optional)"
              value={shoeBrand}
              onChange={(e) => setShoeBrand(e.target.value)}
              placeholder="e.g. Nike, Timberland"
            />
            <Input
              label="Shoe Color (optional)"
              value={shoeColor}
              onChange={(e) => setShoeColor(e.target.value)}
              placeholder="e.g. Black, Navy, Tan"
            />
          </div>

          <Input
            label="Pre-Existing Damage Notes (RCV-04)"
            value={damageNotes}
            onChange={(e) => setDamageNotes(e.target.value)}
            placeholder="e.g. Broken eyelet, heavy sole wear"
          />

          <Textarea
            label="General Repair Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Customer instructions"
            rows={2}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <input
              type="checkbox"
              id="markReceivedCheck"
              checked={markReceived}
              onChange={(e) => setMarkReceived(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <label htmlFor="markReceivedCheck" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
              Mark shoes received immediately and move to Queue
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={loading}
            style={{ marginTop: 'var(--space-4)' }}
          >
            Register & Create Job Tag
          </Button>
        </form>
      </Card>
    </div>
  );
}
