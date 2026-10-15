// Spinner.jsx
export function Spinner({ size = '', white = false, accent = false, className = '' }) {
  const cls = [
    'spinner',
    size && `spinner-${size}`,
    white && 'spinner-white',
    accent && 'spinner-accent',
    className,
  ].filter(Boolean).join(' ');
  return <span className={cls} role="status" aria-label="Loading" />;
}

// Full-page loading screen
export function PageSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--color-bg)',
    }}>
      <Spinner size="lg" accent />
    </div>
  );
}

// Inline loading state (replaces content while fetching)
export function LoadingRows({ rows = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: 'var(--space-4)' }}>
              <div
                className="skeleton"
                style={{ height: 14, width: ci === 0 ? '60%' : ci === cols - 1 ? '40%' : '80%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Skeleton block (for card/form loading states)
export function Skeleton({ height = 16, width = '100%', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width, borderRadius: 'var(--radius-sm)' }}
    />
  );
}
