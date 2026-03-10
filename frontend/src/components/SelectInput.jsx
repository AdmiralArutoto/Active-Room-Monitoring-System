export default function SelectInput({ value, onChange, options = [], placeholder, ...props }) {
  return (
    <select className="select" value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
