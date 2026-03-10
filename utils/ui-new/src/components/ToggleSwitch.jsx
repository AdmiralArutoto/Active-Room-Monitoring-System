import React from "react";

export default function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? "active" : ""}`}
      onClick={() => onChange?.(!checked)}
      aria-pressed={checked}
    >
      <span className="toggle-thumb" />
    </button>
  );
}