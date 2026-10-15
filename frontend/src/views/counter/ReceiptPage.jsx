import { useState, useRef } from 'react';
import { receiptApi } from '../../api/receipt.api';
import {
  Button,
  Card,
  Input,
  Textarea,
  StatusBadge,
  useToast,
  Badge,
} from '../../design-system';
import { formatDateTime, formatPriceRange } from '../../utils/formatters';
import {
  Search,
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export function ReceiptPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searching, setSearching] = useState(false);

  // Intake Form State
  const [damageNotes, setDamageNotes] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || query.trim().length < 2) {
      toast.error('Search query must be at least 2 characters.');
      return;
    }

    try {
      setSearching(true);
      const res = await receiptApi.lookupJobs(query.trim());
      setSearchResults(res.jobs || []);
      if (res.jobs?.length === 0) {
        toast.info('No matching jobs found.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setDamageNotes('');
    setIntakeNotes('');
    setPhotos([]);
    setPhotoPreviews([]);
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed per job.');
      return;
    }

    const nextPhotos = [...photos, ...files];
    setPhotos(nextPhotos);

    const nextPreviews = files.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...nextPreviews]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReceiveJob = async () => {
    if (!selectedJob) return;

    if (photos.length < 2) {
      toast.warning('Recommended: Upload at least 2 photos (front and back/soles) before completing intake.');
    }

    try {
      setSubmitting(true);

      // Step 1: Mark received in database
      await receiptApi.receiveJob(selectedJob.id, {
        pre_existing_damage: damageNotes,
        notes: intakeNotes,
      });

      // Step 2: Upload intake condition photos if selected
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((file) => formData.append('photos', file));
        await receiptApi.uploadPhotos(selectedJob.id, formData);
      }

      toast.success(`Job ${selectedJob.job_number} received & queued for repair!`);
      setSelectedJob(null);
      setSearchResults([]);
      setQuery('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete job receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
          Receive & Tag Shoes
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
          Search for pre-registered drop-offs, verify handover, note pre-existing conditions, and take condition photos.
        </p>
      </div>

      {/* ── SEARCH CARD ───────────────────────────────────────── */}
      <Card style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Search Job Number, Phone, or Customer Name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. SRJ-20261015-001 or 0712345678"
              autoFocus
            />
          </div>
          <Button type="submit" variant="primary" loading={searching}>
            <Search size={16} /> Search
          </Button>
        </form>

        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && !selectedJob && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              Found {searchResults.length} matching registration(s):
            </div>
            {searchResults.map((job) => (
              <div
                key={job.id}
                onClick={() => handleSelectJob(job)}
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>
                      {job.job_number}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    <strong>{job.customer_name}</strong> • {job.customer_phone} • {job.service_name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {job.shoe_brand ? `${job.shoe_brand} (${job.shoe_color || ''})` : 'Shoes'} • Registered {formatDateTime(job.registered_at)}
                  </div>
                </div>
                <Button variant="secondary" size="sm">
                  Select <ArrowRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── SELECTED JOB INTAKE PROCESSING ───────────────────── */}
      {selectedJob && (
        <Card style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                Intake Verification
              </div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', margin: '2px 0 0' }}>
                Job {selectedJob.job_number}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
              Change Selection
            </Button>
          </div>

          {/* Job Overview Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface-secondary)',
            marginBottom: 'var(--space-6)',
          }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Customer</div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                {selectedJob.customer_name}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                {selectedJob.customer_phone}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Service Requested</div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                {selectedJob.service_name}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Band: {formatPriceRange(selectedJob.catalog_min_price, selectedJob.catalog_max_price)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Item Description</div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                {selectedJob.shoe_brand || 'Unspecified Brand'}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Color: {selectedJob.shoe_color || 'Standard'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Current State</div>
              <div><StatusBadge status={selectedJob.status} /></div>
            </div>
          </div>

          {/* Tag Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-info-subtle)',
            color: 'var(--color-info)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-5)',
          }}>
            <QrCode size={20} style={{ flexShrink: 0 }} />
            <span>
              <strong>Tag Requirement (RCV-02):</strong> Fit waterproof barcode tag <strong>#{selectedJob.job_number}</strong> to the shoes before placing in queue.
            </span>
          </div>

          {/* Notes & Damage Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <Input
              label="Pre-Existing Damage / Wear Notes (RCV-04)"
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="e.g. Scuffed heels, ripped insole, missing lace"
              hint="Document visible pre-existing damage to protect shop liability."
            />

            <Input
              label="Additional Intake Notes (optional)"
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
              placeholder="e.g. Customer requested extra attention on suede nap"
            />
          </div>

          {/* ── PHOTO UPLOAD SECTION (RCV-03) ─────────────────── */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  Intake Condition Photos (Min. 2 angles)
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                  ({photos.length}/5 uploaded)
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= 5}
              >
                <Camera size={14} /> Add Photos
              </Button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              multiple
              accept="image/*"
              style={{ display: 'none' }}
            />

            {/* Photo Previews Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 'var(--space-3)',
            }}>
              {photoPreviews.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <img
                    src={url}
                    alt={`Intake preview ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    onClick={() => removePhoto(idx)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {photos.length === 0 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    gridColumn: '1 / -1',
                    padding: 'var(--space-8)',
                    borderRadius: 'var(--radius-md)',
                    border: '2px dashed var(--color-border)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Camera size={28} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                    Capture or Upload Intake Photos
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    Take photos of shoes from at least two angles to document initial condition.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="primary"
            size="lg"
            block
            loading={submitting}
            onClick={handleReceiveJob}
          >
            <CheckCircle2 size={18} /> Confirm Handover & Move to Queue
          </Button>
        </Card>
      )}
    </div>
  );
}
