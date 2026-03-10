export default function TextInput({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder = 'Value',
  disabled = false,
  error = '',
  fullWidth = true,
  inputClassName = '',
  wrapperStyle = {},
  ...props
}) {
  const fallback = label?.toLowerCase().replace(/\s+/g, '-') || 'field';
  const inputId = id || `input-${fallback}`;

  return (
    <label
      htmlFor={inputId}
      style={{
        display: 'grid',
        gap: 8,
        width: fullWidth ? '100%' : 'auto',
        ...wrapperStyle,
      }}
    >
      {label ? <span style={{ fontSize: 14 }}>{label}</span> : null}
      <input
        id={inputId}
        className={`input ${inputClassName}`.trim()}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <span className="error-text">{error}</span> : null}
    </label>
  );
}
