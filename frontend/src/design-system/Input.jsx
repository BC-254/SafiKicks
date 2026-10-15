import { useRef, useEffect } from 'react';

// Input.jsx — Floating label input
// The label floats up when the input has focus or a value.
// Works for text, email, password, tel, number, textarea, and select.

export function Input({
  label, name, type = 'text', value, onChange,
  error, hint, required = false, disabled = false,
  className = '', placeholder = ' ', // placeholder MUST stay ' ' for CSS float trick
  autoComplete, ...props
}) {
  const id = name || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={`input-group ${className}`}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`input-field ${error ? 'input-error' : ''}`}
        {...props}
      />
      <label htmlFor={id} className="input-label">
        {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
      </label>
      {error && <div className="input-error-msg">{error}</div>}
      {hint && !error && <div className="input-hint">{hint}</div>}
    </div>
  );
}

// Select with floating label
export function Select({
  label, name, value, onChange, children,
  error, hint, required = false, disabled = false, className = '',
}) {
  const id = name || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={`input-group ${className}`}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`input-field input-select ${error ? 'input-error' : ''}`}
      >
        {children}
      </select>
      <label htmlFor={id} className="input-label">
        {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
      </label>
      {error && <div className="input-error-msg">{error}</div>}
      {hint && !error && <div className="input-hint">{hint}</div>}
    </div>
  );
}

// Textarea with floating label
export function Textarea({
  label, name, value, onChange,
  error, hint, required = false, rows = 3, className = '',
}) {
  const id = name || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={`input-group ${className}`}>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        rows={rows}
        placeholder=" "
        className={`input-field ${error ? 'input-error' : ''}`}
        style={{ resize: 'vertical', minHeight: 80, paddingTop: 20 }}
      />
      <label htmlFor={id} className="input-label">
        {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
      </label>
      {error && <div className="input-error-msg">{error}</div>}
      {hint && !error && <div className="input-hint">{hint}</div>}
    </div>
  );
}

// OTP 6-box input (phone verification + pickup code)
export function OtpInput({ value = '', onChange, disabled = false, error = false }) {
  const inputs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      const next = digits.map((d, i) => i === idx ? '' : d).join('');
      onChange(next);
      if (idx > 0) inputs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowLeft'  && idx > 0) { inputs.current[idx - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && idx < 5) { inputs.current[idx + 1]?.focus(); return; }
  };

  const handleChange = (e, idx) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    const char = raw[raw.length - 1];
    const next = digits.map((d, i) => i === idx ? char : d).join('');
    onChange(next);
    if (idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          style={{
            width: 46, height: 56,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 600,
            border: `1.5px solid ${error ? 'var(--color-danger)' : d ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            outline: 'none',
            transition: 'var(--transition-base)',
            fontFamily: 'var(--font-family)',
            caretColor: 'var(--color-accent)',
          }}
        />
      ))}
    </div>
  );
}
