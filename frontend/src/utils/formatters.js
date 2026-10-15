// formatters.js — date, currency, status display helpers

// ── Currency (KES) ────────────────────────────────────────────
export const formatKES = (amount) => {
  if (amount == null || amount === '') return '—';
  return `KES ${Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// ── Dates ─────────────────────────────────────────────────────
const dateFormatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric', month: 'short', year: 'numeric',
  timeZone: 'Africa/Nairobi',
});

const timeFormatter = new Intl.DateTimeFormat('en-KE', {
  hour: '2-digit', minute: '2-digit', hour12: true,
  timeZone: 'Africa/Nairobi',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
  timeZone: 'Africa/Nairobi',
});

export const formatDate     = (d) => d ? dateFormatter.format(new Date(d))     : '—';
export const formatTime     = (d) => d ? timeFormatter.format(new Date(d))     : '—';
export const formatDateTime = (d) => d ? dateTimeFormatter.format(new Date(d)) : '—';

// Relative time (e.g. "2 hours ago")
export const formatRelative = (d) => {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return formatDate(d);
};

// ── Roles ─────────────────────────────────────────────────────
const ROLE_LABELS = {
  owner:         'Owner',
  counter_staff: 'Counter Staff',
  repairer:      'Repairer',
};
export const formatRole = (role) => ROLE_LABELS[role] || role;

// ── Price range ───────────────────────────────────────────────
export const formatPriceRange = (min, max) => {
  if (!min && !max) return 'Any amount';
  if (!max || min === max) return formatKES(min) + ' (fixed)';
  return `${formatKES(min)} – ${formatKES(max)}`;
};

// ── Phone normalisation ───────────────────────────────────────
export const normalisePhone = (raw) => {
  // Convert 07xx → +2547xx, strip spaces/dashes
  let p = String(raw || '').replace(/[\s\-().]/g, '');
  if (p.startsWith('07'))  p = '+254' + p.slice(1);
  if (p.startsWith('7'))   p = '+254' + p;
  if (p.startsWith('254')) p = '+' + p;
  return p;
};

// ── Initials avatar ───────────────────────────────────────────
export const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
