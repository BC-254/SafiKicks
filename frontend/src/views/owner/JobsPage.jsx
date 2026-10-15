import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ownerApi } from '../../api/owner.api';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  PaymentBadge,
  Badge,
  Modal,
  PageSpinner,
  useToast,
} from '../../design-system';
import {
  formatKES,
  formatDate,
  formatDateTime,
  formatRelative,
} from '../../utils/formatters';
import {
  Search,
  Filter,
  Eye,
  X,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Tag,
  CreditCard,
  Camera,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const STATUS_OPTIONS = [
  'All',
  'Registered',
  'In Queue',
  'Awaiting Confirmation',
  'Started',
  'On Hold',
  'Completed',
  'Picked',
  'Cancelled',
];

const PAYMENT_OPTIONS = ['All', 'Unpaid', 'Part-paid', 'Paid'];

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Slide-over inspection drawer state
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const toast = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        status: selectedStatus === 'All' ? undefined : selectedStatus,
        payment_status: selectedPayment === 'All' ? undefined : selectedPayment,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        q: debouncedQuery || undefined,
      };

      const res = await ownerApi.getJobs(params);
      setJobs(res.jobs || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error('Could not load jobs: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedPayment, dateFrom, dateTo, debouncedQuery, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Load detailed single job
  const handleOpenDetail = async (id) => {
    try {
      setSelectedJobId(id);
      setDetailLoading(true);
      const res = await ownerApi.getJobDetail(id);
      setJobDetail(res);
    } catch (err) {
      toast.error('Failed to load job details: ' + (err.response?.data?.error || err.message));
      setSelectedJobId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedJobId(null);
    setJobDetail(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-1)',
        }}>
          Job Oversight
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Comprehensive view of all customer repair orders, payments, and audit history
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Top row: search + date range */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <Input
                placeholder="Search job#, customer, phone, brand..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                From:
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                To:
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              {(dateFrom || dateTo || query) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDateFrom(''); setDateTo(''); setQuery(''); setPage(1); }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Status chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginRight: 'var(--space-1)' }}>
              Status:
            </span>
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st}
                onClick={() => { setSelectedStatus(st); setPage(1); }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '980px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: selectedStatus === st ? 600 : 400,
                  border: 'none',
                  backgroundColor: selectedStatus === st ? 'var(--color-accent)' : 'var(--color-surface-sunken)',
                  color: selectedStatus === st ? '#FFFFFF' : 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Payment chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginRight: 'var(--space-1)' }}>
              Payment:
            </span>
            {PAYMENT_OPTIONS.map((pm) => (
              <button
                key={pm}
                onClick={() => { setSelectedPayment(pm); setPage(1); }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '980px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: selectedPayment === pm ? 600 : 400,
                  border: 'none',
                  backgroundColor: selectedPayment === pm ? 'var(--color-text)' : 'var(--color-surface-sunken)',
                  color: selectedPayment === pm ? '#FFFFFF' : 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {pm}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{
          padding: 'var(--space-3) var(--space-5)',
          borderBottom: 'var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Showing <strong>{jobs.length}</strong> of <strong>{total}</strong> jobs
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <PageSpinner message="Loading jobs..." />
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No jobs match the specified criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{
                  borderBottom: 'var(--card-border)',
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'left',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: 'var(--color-surface-sunken)',
                }}>
                  <th style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600 }}>Job & Tag</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Shoe</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Service</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Repairer</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>Payment</th>
                  <th style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onClick={() => handleOpenDetail(job.id)}
                  >
                    <td style={{ padding: 'var(--space-3) var(--space-5)', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div>{job.job_number}</div>
                      {job.tag_number && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                          Tag #{job.tag_number}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text)' }}>
                      <div>{job.shoe_brand}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        {job.shoe_color || 'Standard color'}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{job.customer_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{job.customer_phone}</div>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text)' }}>
                      {job.service_name}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                      {job.repairer_name || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <StatusBadge status={job.status} />
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <PaymentBadge status={job.payment_status} />
                      {job.latest_price && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                          {formatKES(job.latest_price)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-5)', textAlign: 'right' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(job.id);
                        }}
                      >
                        <Eye size={13} style={{ marginRight: '4px' }} /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: 'var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} /> Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Slide-over Job Inspection Modal */}
      {selectedJobId && (
        <Modal
          isOpen={Boolean(selectedJobId)}
          onClose={handleCloseDetail}
          title={jobDetail?.job?.job_number ? `Job ${jobDetail.job.job_number}` : 'Job Details'}
          size="lg"
        >
          {detailLoading || !jobDetail ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <PageSpinner message="Loading full job history..." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
              {/* Job Header & Badges */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                    {jobDetail.job.shoe_brand} {jobDetail.job.shoe_color ? `— ${jobDetail.job.shoe_color}` : ''}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Service: <strong>{jobDetail.job.service_name}</strong> (Catalog: {formatKES(jobDetail.job.catalog_min_price)} – {formatKES(jobDetail.job.catalog_max_price)})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <StatusBadge status={jobDetail.job.status} />
                  <PaymentBadge status={jobDetail.job.payment_status} />
                </div>
              </div>

              {/* Customer & Assignment Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-4)',
              }}>
                <Card style={{ padding: 'var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                    Customer Details
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{jobDetail.job.customer_name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{jobDetail.job.customer_phone}</div>
                  {jobDetail.job.customer_notes && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
                      "{jobDetail.job.customer_notes}"
                    </div>
                  )}
                </Card>

                <Card style={{ padding: 'var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                    Repairer Assignment
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {jobDetail.job.repairer_name || 'Not yet claimed'}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    {jobDetail.job.repairer_email || 'Awaiting repairer from queue'}
                  </div>
                  {jobDetail.job.tag_number && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
                      Physical Tag: #{jobDetail.job.tag_number}
                    </div>
                  )}
                </Card>
              </div>

              {/* Problem Description */}
              {jobDetail.job.problem_description && (
                <div style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--color-surface)', border: 'var(--card-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Customer Problem Description
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    {jobDetail.job.problem_description}
                  </div>
                </div>
              )}

              {/* Photos Section */}
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={16} /> Inspection Photos ({jobDetail.photos?.length || 0})
                </div>
                {jobDetail.photos?.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                    No photos captured for this job.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
                    {jobDetail.photos.map((ph) => (
                      <div key={ph.id} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <img
                          src={ph.file_url}
                          alt={ph.type}
                          style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{ padding: '4px 6px', fontSize: '10px', backgroundColor: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                          {ph.type} • {formatDate(ph.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Version History */}
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
                  Price Quotes & Approvals ({jobDetail.priceVersions?.length || 0})
                </div>
                {jobDetail.priceVersions?.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                    No price proposals recorded yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-tertiary)' }}>
                        <th style={{ padding: '6px' }}>Version</th>
                        <th style={{ padding: '6px' }}>Amount</th>
                        <th style={{ padding: '6px' }}>Proposed By</th>
                        <th style={{ padding: '6px' }}>Owner Approved</th>
                        <th style={{ padding: '6px' }}>Customer Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobDetail.priceVersions.map((pv) => (
                        <tr key={pv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '6px', fontWeight: 600 }}>v{pv.version_number}</td>
                          <td style={{ padding: '6px', fontWeight: 700, color: 'var(--color-text)' }}>{formatKES(pv.amount)}</td>
                          <td style={{ padding: '6px' }}>{pv.proposed_by_name}</td>
                          <td style={{ padding: '6px' }}>
                            {pv.approved_by_name ? (
                              <Badge variant="success" size="sm">✓ {pv.approved_by_name}</Badge>
                            ) : (
                              <span style={{ color: 'var(--color-text-tertiary)' }}>In-band (Auto)</span>
                            )}
                          </td>
                          <td style={{ padding: '6px' }}>
                            {pv.customer_response === 'confirmed' ? (
                              <Badge variant="success" size="sm">Confirmed</Badge>
                            ) : pv.customer_response === 'declined' ? (
                              <Badge variant="danger" size="sm">Declined</Badge>
                            ) : (
                              <Badge variant="warning" size="sm">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Payments Ledger */}
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
                  Payments Ledger ({jobDetail.payments?.length || 0})
                </div>
                {jobDetail.payments?.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                    No payments recorded yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-tertiary)' }}>
                        <th style={{ padding: '6px' }}>Date</th>
                        <th style={{ padding: '6px' }}>Amount</th>
                        <th style={{ padding: '6px' }}>Method</th>
                        <th style={{ padding: '6px' }}>Reference</th>
                        <th style={{ padding: '6px' }}>Received By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobDetail.payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '6px' }}>{formatDateTime(p.created_at)}</td>
                          <td style={{ padding: '6px', fontWeight: 700, color: p.type === 'payment' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {p.type === 'payment' ? '+' : '-'}{formatKES(p.amount)}
                          </td>
                          <td style={{ padding: '6px', textTransform: 'uppercase' }}>{p.method}</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace' }}>{p.reference || '—'}</td>
                          <td style={{ padding: '6px' }}>{p.received_by_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
