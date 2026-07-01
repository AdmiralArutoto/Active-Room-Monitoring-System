export default function ToggleSwitch({ checked, onChange, title }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'active' : ''}`}
      onClick={() => onChange?.(!checked)}
      aria-pressed={checked}
      title={title}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
