import { LoadingRows } from './Spinner';

// Table.jsx — clean borderless table with skeleton loading

export function Table({
  columns,      // [{ key, label, render?, width?, align? }]
  rows,         // array of data objects
  keyField = 'id',
  loading = false,
  onRowClick,
  emptyMessage = 'No records found.',
  emptyIcon,
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  textAlign: col.align || 'left',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRows rows={6} cols={columns.length} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-8)' }}>
                  {emptyIcon && <div className="empty-state-icon">{emptyIcon}</div>}
                  <p className="empty-state-text">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : {}}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Pagination controls
export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--space-2)', padding: 'var(--space-4) 0',
      fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
    }}>
      <button
        className="btn btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ← Prev
      </button>
      <span>Page {page} of {totalPages}</span>
      <button
        className="btn btn-ghost btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next →
      </button>
    </div>
  );
}
