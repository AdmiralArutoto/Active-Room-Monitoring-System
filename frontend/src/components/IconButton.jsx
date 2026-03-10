export default function IconButton({
  icon,
  label,
  onClick,
  danger = false,
  active = false,
  disabled = false,
  size = 34,
  title,
  style = {},
  ...props
}) {
  return (
    <button
      type="button"
      className="icon-button"
      onClick={onClick}
      aria-label={label}
      title={title || label}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        color: danger
          ? 'var(--danger)'
          : active
          ? 'var(--action-primary)'
          : 'var(--text-secondary)',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      {...props}
    >
      {icon}
    </button>
  );
}
