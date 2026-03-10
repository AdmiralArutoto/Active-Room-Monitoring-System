export default function StatusPill({ value }) {
  const raw = value == null ? '' : String(value).trim();
  const v = raw.toLowerCase();

  if (v === 'on' || v === 'active' || v === 'detected') {
    return <span className="status-pill status-pill--on">ON</span>;
  }

  if (v === 'off' || v === 'idle') {
    return <span className="status-pill status-pill--off">OFF</span>;
  }

  if (v === 'fault' || v === 'error') {
    return <span className="status-pill status-pill--warn">{raw.toUpperCase()}</span>;
  }

  return <span className="status-pill status-pill--neutral">{raw || '—'}</span>;
}
