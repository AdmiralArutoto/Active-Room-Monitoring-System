import React from "react";

export default function SelectInput({ value, onChange, options = [], placeholder }) {
  return (
    <select className="select" value={value} onChange={onChange}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}