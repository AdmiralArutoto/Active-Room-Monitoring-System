export default function SearchFilterInput({ value, onChange, placeholder = 'Filter', ...props }) {
  return (
    <label className="search-filter" aria-label="Filter">
      <span style={{ color: 'var(--text-secondary)', fontSize: 16 }}>⌵</span>
      <input value={value} onChange={onChange} placeholder={placeholder} {...props} />
    </label>
  );
}
