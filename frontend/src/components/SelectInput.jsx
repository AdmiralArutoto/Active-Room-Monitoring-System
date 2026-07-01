export default function SelectInput({ label, value, onChange, options = [], placeholder, ...props }) {
  const select = (
    <select className="select" value={value} onChange={onChange} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <label style={{ display: 'grid', gap: 8, width: '100%' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      {select}
    </label>
  );
}
