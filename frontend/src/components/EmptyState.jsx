export default function EmptyState({
  title = 'No data',
  description = '',
  actionLabel = '',
  onAction,
  minHeight = 240,
  centered = true,
}) {
  return (
    <div
      className="empty-state"
      style={{ minHeight, textAlign: centered ? 'center' : 'left' }}
    >
      <div style={{ display: 'grid', gap: 10, maxWidth: 460 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}
        </div>

        {description ? (
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {description}
          </div>
        ) : null}

        {actionLabel ? (
          <button
            type="button"
            className="button"
            onClick={onAction}
            style={{
              justifySelf: centered ? 'center' : 'start',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontWeight: 700,
              padding: 0,
              height: 'auto',
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
