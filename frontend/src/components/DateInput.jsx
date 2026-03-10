export default function DateInput({
  label,
  id,
  value,
  onChange,
  placeholder = 'dd / mm / yyyy',
  disabled = false,
  fullWidth = false,
  wrapperStyle = {},
  ...props
}) {
  const fallback = label?.toLowerCase().replace(/\s+/g, '-') || 'field';
  const inputId = id || `date-${fallback}`;

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
        className="date-input"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
    </label>
  );
}
