import { useState, useEffect, useCallback } from 'react';
import { receiptApi } from '../../api/receipt.api';
import {
  Card,
  Table,
  Pagination,
  StatusBadge,
  PaymentBadge,
  Input,
  Modal,
  Button,
  Badge,
} from '../../design-system';
import { formatDateTime, formatKES, formatPriceRange } from '../../utils/formatters';
import { Search, Eye, Filter, Clock, Camera, User } from 'lucide-react';

export function AllJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal state
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await receiptApi.getCounterJobs({
        page,
        limit: 15,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setJobs(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (_) {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRowClick = async (row) => {
    setSelectedJobId(row.id);
    setDetailLoading(true);
    try {
      const data = await receiptApi.getJobDetail(row.id);
      setDetailData(data);
    } catch (_) {
      // Handled
    } finally {
      setDetailLoading(false);
    }
  };

  const statusChips = [
    { label: 'All Jobs', value: '' },
    { label: 'Awaiting Drop-off', value: 'Registered' },
    { label: 'In Queue', value: 'In Queue' },
    { label: 'In Progress', value: 'Started' },
    { label: 'Ready for Pickup', value: 'Completed' },
    { label: 'Picked / Released', value: 'Picked' },
  ];

  const columns = [
    {
      key: 'job_number',
      label: 'Job #',
      render: (num, row) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{num}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            {row.channel === 'staff_registered' ? 'Staff Registered' : 'Self Registered'}
          </div>
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{name}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {row.customer_phone || 'No Phone'}
          </div>
        </div>
      ),
    },
    {
      key: 'service_name',
      label: 'Service & Item',
      render: (srv, row) => (
        <div>
          <div>{srv}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {row.shoe_brand ? `${row.shoe_brand} (${row.shoe_color || ''})` : 'Shoes'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (st) => <StatusBadge status={st} />,
    },
    {
      key: 'payment_status',
      label: 'Payment',
      render: (st) => <PaymentBadge status={st} />,
    },
    {
      key: 'price',
      label: 'Quote',
      render: (_, row) => (
        <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
          {row.current_price != null ? formatKES(row.current_price) : 'Pending'}
        </span>
      ),
    },
    {
      key: 'repairer',
      label: 'Technician',
      render: (_, row) => row.assigned_repairer_name || <span style={{ color: 'var(--color-text-tertiary)' }}>Unassigned</span>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
          Job Directory
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
          Complete record of all shoe repair registrations and active progress.
        </p>
      </div>

      {/* Filter Chips & Search Bar */}
      <Card flat style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {statusChips.map((c) => (
            <button
              key={c.value}
              onClick={() => { setStatusFilter(c.value); setPage(1); }}
              className="btn btn-sm"
              style={{
                backgroundColor: statusFilter === c.value ? 'var(--color-text-primary)' : 'var(--color-surface-secondary)',
                color: statusFilter === c.value ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                border: 'none',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Search Job #, Customer Name, or Phone"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search..."
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card flat style={{ padding: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          rows={jobs}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No jobs found matching your criteria."
        />
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </Card>

      {/* Job Detail Modal */}
      <Modal
        open={Boolean(selectedJobId)}
        onClose={() => { setSelectedJobId(null); setDetailData(null); }}
        title={`Job Details • ${detailData?.job?.job_number || ''}`}
        size="lg"
      >
        {detailData?.job && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Quick summary badges */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <StatusBadge status={detailData.job.status} />
              <PaymentBadge status={detailData.job.payment_status} />
              {detailData.job.channel === 'staff_registered' && <Badge variant="blue">Staff Intake</Badge>}
            </div>

            {/* Info Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-secondary)',
            }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Customer</div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  {detailData.job.customer_name}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  {detailData.job.customer_phone || 'No phone'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Service</div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  {detailData.job.service_name}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Band: {formatPriceRange(detailData.job.catalog_min_price, detailData.job.catalog_max_price)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Assigned Repairer</div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  {detailData.job.assigned_repairer_name || 'Unassigned'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Price & Balance</div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  {detailData.job.current_price != null ? formatKES(detailData.job.current_price) : 'No quote yet'}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Paid: {formatKES(detailData.job.total_paid)}
                </div>
              </div>
            </div>

            {/* Notes if any */}
            {detailData.job.notes && (
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', whiteSpace: 'pre-line' }}>
                <strong>Intake Notes:</strong><br />
                {detailData.job.notes}
              </div>
            )}

            {/* Photos */}
            {detailData.photos && detailData.photos.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Intake & Progress Photos ({detailData.photos.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                  {detailData.photos.map((p) => (
                    <a key={p.id} href={p.file_url} target="_blank" rel="noreferrer">
                      <img
                        src={p.file_url}
                        alt="Repair photo"
                        style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>
                Immutable Audit History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {detailData.timeline?.map((evt) => (
                  <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', borderBottom: '1px solid var(--color-border-light)', paddingBottom: 4 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{evt.actor_label}:</span> {evt.notes || evt.event_type}
                    </div>
                    <div style={{ color: 'var(--color-text-tertiary)' }}>
                      {formatDateTime(evt.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
