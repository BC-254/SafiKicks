// Card.jsx
export function Card({ children, className = '', flat = false, ...props }) {
  return (
    <div className={`${flat ? 'card-flat' : 'card'} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="card-header">
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// StatCard — KPI summary tile for dashboards
export function StatCard({ value, label, icon, accent = false }) {
  return (
    <div className="stat-card" style={accent ? { borderTop: '3px solid var(--color-accent)' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-card-value">{value ?? '—'}</div>
          <div className="stat-card-label">{label}</div>
        </div>
        {icon && (
          <div style={{ color: 'var(--color-text-tertiary)' }}>{icon}</div>
        )}
      </div>
    </div>
  );
}
