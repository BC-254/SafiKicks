// Button.jsx
export function Button({
  children, variant = 'primary', size = '', block = false,
  icon = false, loading = false, disabled = false,
  className = '', onClick, type = 'button', ...props
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size && `btn-${size}`,
    block && 'btn-block',
    icon && 'btn-icon',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="spinner spinner-sm spinner-white" />}
      {children}
    </button>
  );
}
