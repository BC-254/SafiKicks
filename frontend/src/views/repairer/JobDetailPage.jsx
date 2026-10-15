import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { repairerApi } from '../../api/repairer.api';
import {
  Card,
  Button,
  Input,
  StatusBadge,
  Badge,
  Modal,
  PageSpinner,
  useToast,
} from '../../design-system';
import {
  ArrowLeft,
  Wrench,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Send,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [jobData, setJobData] = useState(null);

  // Pricing form state
  const [priceAmount, setPriceAmount] = useState('');
  const [priceNotes, setPriceNotes] = useState('');
  const [submittingPrice, setSubmittingPrice] = useState(false);

  // Hold modal state
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Photo upload state
  const [completionFiles, setCompletionFiles] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Image zoom modal
  const [zoomedImage, setZoomedImage] = useState(null);

  // Timeline collapsed state
  const [timelineOpen, setTimelineOpen] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      setLoading(true);
      const data = await repairerApi.getJobDetail(id);
      setJobData(data);
    } catch (err) {
      addToast({
        title: 'Could not load job',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
      navigate('/repairer/queue');
    } finally {
      setLoading(false);
    }
  }, [id, addToast, navigate]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  if (loading || !jobData) {
    return <PageSpinner />;
  }

  const { job, photos = [], priceVersions = [], timeline = [] } = jobData;

  const minPrice = parseFloat(job.catalog_min_price || 0);
  const maxPrice = job.catalog_max_price !== null ? parseFloat(job.catalog_max_price) : null;
  const numPrice = parseFloat(priceAmount);
  const isOutOfBand = priceAmount && !isNaN(numPrice) && (numPrice < minPrice || (maxPrice !== null && numPrice > maxPrice));

  // Handle Price Proposal
  const handleProposePrice = async (e) => {
    e.preventDefault();
    if (!priceAmount || isNaN(numPrice) || numPrice <= 0) {
      addToast({ title: 'Invalid price', message: 'Please enter a valid price amount.', type: 'error' });
      return;
    }

    try {
      setSubmittingPrice(true);
      const res = await repairerApi.proposePrice(id, {
        amount: numPrice,
        notes: priceNotes,
      });

      if (res.inBand) {
        addToast({
          title: 'Price Proposed',
          message: res.message,
          type: 'success',
        });
      } else {
        addToast({
          title: 'Out-of-band Price Submitted',
          message: res.message,
          type: 'info',
        });
      }

      setPriceAmount('');
      setPriceNotes('');
      fetchJob();
    } catch (err) {
      addToast({
        title: 'Pricing failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setSubmittingPrice(false);
    }
  };

  // Handle Status Update (Completed or On Hold)
  const handleStatusUpdate = async (newStatus, customReason = null) => {
    try {
      setUpdatingStatus(true);
      await repairerApi.updateStatus(id, {
        status: newStatus,
        hold_reason: customReason,
      });

      addToast({
        title: 'Status Updated',
        message: `Job marked as ${newStatus}.`,
        type: 'success',
      });

      if (holdModalOpen) setHoldModalOpen(false);
      fetchJob();
    } catch (err) {
      addToast({
        title: 'Status update failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Completion Photos Upload
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      addToast({ title: 'Limit exceeded', message: 'Maximum 5 photos allowed at a time.', type: 'warning' });
      return;
    }
    setCompletionFiles(files);
  };

  const handleUploadCompletionPhotos = async () => {
    if (completionFiles.length === 0) return;

    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      completionFiles.forEach((f) => formData.append('photos', f));

      await repairerApi.uploadCompletionPhotos(id, formData);
      addToast({ title: 'Photos Uploaded', message: 'Completion photos saved.', type: 'success' });
      setCompletionFiles([]);
      fetchJob();
    } catch (err) {
      addToast({
        title: 'Upload failed',
        message: err.response?.data?.error || err.message,
        type: 'error',
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const receiptPhotos = photos.filter((p) => p.type === 'receipt');
  const completionPhotos = photos.filter((p) => p.type === 'completion');

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 'var(--space-12)' }}>
      {/* Navigation breadcrumb */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          to="/repairer/queue"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            textDecoration: 'none',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          <ArrowLeft size={16} /> Back to Repair Queue
        </Link>
      </div>

      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
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
              fontFamily: 'var(--font-mono)',
            }}>
              {job.job_number}
            </h1>
            <StatusBadge status={job.status} />
            <Badge variant={job.payment_status === 'Paid' ? 'success' : 'neutral'}>
              {job.payment_status}
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Customer: <strong>{job.customer_first_name}</strong> · Intake by {job.received_by_name || 'Staff'}
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Job Specifications Card */}
        <Card>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
            Repair Item Overview
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Service Requested
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginTop: 2 }}>
                {job.service_name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Catalog Price Band
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginTop: 2 }}>
                KES {minPrice.toLocaleString()} {maxPrice !== null ? `– ${maxPrice.toLocaleString()}` : '+'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Shoe Details
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginTop: 2 }}>
                {job.shoe_brand || 'Unspecified'} · {job.shoe_color || 'Standard'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Current Status
              </div>
              <div style={{ marginTop: 2 }}>
                <StatusBadge status={job.status} size="sm" />
              </div>
            </div>
          </div>

          {job.notes && (
            <div style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)',
              lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-line',
            }}>
              <strong>Intake & Customer Notes:</strong>
              <div style={{ marginTop: 4 }}>{job.notes}</div>
            </div>
          )}
        </Card>

        {/* Section: Price Proposal (If In Queue or On Hold) */}
        {(job.status === 'In Queue' || job.status === 'On Hold') && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <DollarSign size={18} style={{ color: 'var(--color-accent)' }} />
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                {job.status === 'On Hold' ? 'Propose Revised Quote' : 'Inspect & Propose Price'}
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
              Standard price band for {job.service_name} is <strong>KES {minPrice.toLocaleString()} – {maxPrice !== null ? maxPrice.toLocaleString() : 'any'}</strong>.
            </p>

            <form onSubmit={handleProposePrice}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)' }}>
                <Input
                  label="Amount (KES)"
                  type="number"
                  step="10"
                  min="50"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  placeholder="e.g. 350"
                  required
                />
                <Input
                  label="Work Description / Rationale"
                  value={priceNotes}
                  onChange={(e) => setPriceNotes(e.target.value)}
                  placeholder="e.g. Full sole reglue and heel stabilization"
                />
              </div>

              {isOutOfBand && (
                <div style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-warning-subtle)',
                  border: '1px solid var(--color-warning)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text)',
                }}>
                  <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <span>
                    <strong>Out-of-band price:</strong> KES {numPrice.toLocaleString()} is outside the catalog band (KES {minPrice} – {maxPrice || 'unlimited'}). It will be routed to the <strong>Owner for approval</strong> before any customer SMS is dispatched.
                  </span>
                </div>
              )}

              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submittingPrice}
                  icon={<Send size={14} />}
                >
                  {isOutOfBand ? 'Submit for Owner Approval' : 'Submit & Send Confirmation SMS'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Section: Status-Specific Notices & Execution Controls */}
        {job.status === 'Awaiting Confirmation' && (
          <Card style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Clock size={20} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Awaiting Customer Confirmation
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  The customer has received an SMS with their private tracking link. Repair work may commence once they tap confirm on their portal.
                </p>
              </div>
            </div>
          </Card>
        )}

        {job.status === 'Started' && (
          <Card>
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Repair In Progress
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
              Work is actively underway. Upload completion photos before or right when marking the job completed.
            </p>

            {/* Completion photo upload */}
            <div style={{
              padding: 'var(--space-4)',
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              marginBottom: 'var(--space-6)',
              backgroundColor: 'var(--color-surface-sunken)',
            }}>
              <Camera size={24} style={{ color: 'var(--color-text-tertiary)', marginBottom: 8 }} />
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Add Completion Photos (Optional but recommended)
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2, marginBottom: 'var(--space-3)' }}>
                Show finished craftsmanship to customer upon collection.
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
                id="completion-photo-input"
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
                <label htmlFor="completion-photo-input">
                  <Button variant="secondary" size="sm" as="span">
                    Select Photos
                  </Button>
                </label>
                {completionFiles.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleUploadCompletionPhotos}
                    loading={uploadingPhotos}
                  >
                    Upload {completionFiles.length} Photo{completionFiles.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <Button
                variant="secondary"
                onClick={() => setHoldModalOpen(true)}
                icon={<PauseCircle size={16} />}
              >
                Put On Hold
              </Button>

              <Button
                variant="primary"
                onClick={() => handleStatusUpdate('Completed')}
                loading={updatingStatus}
                icon={<CheckCircle2 size={16} />}
              >
                Mark Completed & Notify Customer
              </Button>
            </div>
          </Card>
        )}

        {/* Section: Photos (Intake & Completion) */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              Photo Documentation
            </h2>
            <Badge variant="neutral">
              {photos.length} total photo{photos.length === 1 ? '' : 's'}
            </Badge>
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
              Intake Receipt Condition ({receiptPhotos.length})
            </h3>
            {receiptPhotos.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>No intake photos uploaded.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
                {receiptPhotos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setZoomedImage(p.file_url)}
                    style={{
                      height: 110,
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface-sunken)',
                    }}
                  >
                    <img
                      src={p.file_url}
                      alt="Intake condition"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {completionPhotos.length > 0 && (
            <div>
              <h3 style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                Completion Craftsmanship ({completionPhotos.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
                {completionPhotos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setZoomedImage(p.file_url)}
                    style={{
                      height: 110,
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface-sunken)',
                    }}
                  >
                    <img
                      src={p.file_url}
                      alt="Completed craft"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Section: Pricing History */}
        {priceVersions.length > 0 && (
          <Card>
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
              Pricing Versions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {priceVersions.map((pv) => (
                <div
                  key={pv.id}
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
                    <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                      v{pv.version_number}: KES {parseFloat(pv.amount).toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-3)' }}>
                      Proposed by {pv.proposed_by_name}
                    </span>
                    {pv.approved_by_name && (
                      <span style={{ color: 'var(--color-success)', marginLeft: 'var(--space-2)' }}>
                        · Approved by {pv.approved_by_name}
                      </span>
                    )}
                  </div>
                  <div>
                    <Badge variant={
                      pv.customer_response === 'confirmed' ? 'success' :
                      pv.customer_response === 'declined' ? 'danger' : 'neutral'
                    }>
                      {pv.customer_response ? `Customer ${pv.customer_response}` : 'Pending Confirmation'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Section: Audit Timeline Accordion */}
        <Card>
          <div
            onClick={() => setTimelineOpen(!timelineOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FileText size={18} style={{ color: 'var(--color-text-secondary)' }} />
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Immutable Audit Trail ({timeline.length})
              </h2>
            </div>
            {timelineOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {timelineOpen && (
            <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-separator)', paddingTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {timeline.map((evt, idx) => (
                  <div key={evt.id || idx} style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}>
                    <div style={{ color: 'var(--color-text-tertiary)', minWidth: 130 }}>
                      {new Date(evt.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>
                      <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                        {evt.event_type}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-2)' }}>
                        by {evt.actor_label || 'System'}
                      </span>
                      {evt.notes && (
                        <div style={{ color: 'var(--color-text-tertiary)', marginTop: 2 }}>{evt.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Put On Hold Modal */}
      <Modal
        isOpen={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        title="Place Job On Hold"
      >
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
          Specify the reason why work cannot continue. If additional charges or parts are needed, you will also be able to submit a revised quote.
        </p>
        <Input
          label="Reason for Hold"
          value={holdReason}
          onChange={(e) => setHoldReason(e.target.value)}
          placeholder="e.g. Awaiting specialized glue or outsole replacement parts"
          required
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => setHoldModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => handleStatusUpdate('On Hold', holdReason)}
            loading={updatingStatus}
            disabled={!holdReason.trim()}
          >
            Confirm Hold
          </Button>
        </div>
      </Modal>

      {/* Photo Zoom Modal */}
      <Modal
        isOpen={Boolean(zoomedImage)}
        onClose={() => setZoomedImage(null)}
        title="Photo Inspection"
        maxWidth={720}
      >
        {zoomedImage && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={zoomedImage}
              alt="Inspection Zoom"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
