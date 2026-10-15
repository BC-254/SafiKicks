// Badge.jsx — small pill label

export function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}

// RoleBadge — maps user role to badge colour
const ROLE_VARIANTS = {
  owner:         'purple',
  counter_staff: 'blue',
  repairer:      'teal',
};
const ROLE_LABELS = {
  owner:         'Owner',
  counter_staff: 'Counter Staff',
  repairer:      'Repairer',
};

export function RoleBadge({ role }) {
  return (
    <Badge variant={ROLE_VARIANTS[role] || 'gray'}>
      {ROLE_LABELS[role] || role}
    </Badge>
  );
}

// ActiveBadge — green active / gray inactive
export function ActiveBadge({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 'var(--font-size-xs)', fontWeight: 500,
      color: active ? 'var(--status-completed-text)' : 'var(--color-text-tertiary)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: active ? 'var(--color-success)' : 'var(--color-text-tertiary)',
        flexShrink: 0,
      }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
