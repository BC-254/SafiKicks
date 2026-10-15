// StatusBadge.jsx — maps job_status string to the correct CSS class + label

const STATUS_CONFIG = {
  'Registered':            { label: 'Registered',             cls: 'status-Registered' },
  'In Queue':              { label: 'In Queue',                cls: 'status-In-Queue' },
  'Awaiting Confirmation': { label: 'Awaiting Confirmation',   cls: 'status-Awaiting-Confirmation' },
  'Started':               { label: 'In Progress',             cls: 'status-Started' },
  'On Hold':               { label: 'On Hold',                 cls: 'status-On-Hold' },
  'Completed':             { label: 'Ready for Pickup',        cls: 'status-Completed' },
  'Picked':                { label: 'Collected',               cls: 'status-Picked' },
  'Expired':               { label: 'Expired',                 cls: 'status-Expired' },
  'Cancelled':             { label: 'Cancelled',               cls: 'status-Cancelled' },
  'Abandoned':             { label: 'Abandoned',               cls: 'status-Abandoned' },
  'Closed':                { label: 'Closed',                  cls: 'status-Closed' },
};

export function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || { label: status, cls: 'status-Closed' };
  return (
    <span className={`badge ${config.cls} ${className}`}>
      {config.label}
    </span>
  );
}

// PaymentBadge
const PAYMENT_CONFIG = {
  'Unpaid':    { label: 'Unpaid',     bg: 'var(--status-cancelled-bg)',  color: 'var(--status-cancelled-text)' },
  'Part-paid': { label: 'Part Paid',  bg: 'var(--status-awaiting-bg)',   color: 'var(--status-awaiting-text)' },
  'Paid':      { label: 'Paid',       bg: 'var(--status-completed-bg)',  color: 'var(--status-completed-text)' },
};

export function PaymentBadge({ status }) {
  const c = PAYMENT_CONFIG[status] || { label: status, bg: '#F2F2F7', color: '#48484A' };
  return (
    <span className="badge" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}
