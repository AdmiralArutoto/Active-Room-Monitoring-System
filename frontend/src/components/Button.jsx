export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button className={`button button-primary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button className={`button button-secondary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button className={`button button-ghost ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
