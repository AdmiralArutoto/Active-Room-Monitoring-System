// src/components/TextInput.jsx
import React from "react";

export default function TextInput({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder = "Value",
  disabled = false,
  error = "",
  fullWidth = true,
  inputClassName = "",
  wrapperStyle = {},
  ...props
}) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, "-") || "field"}`;

  return (
    <label
      htmlFor={inputId}
      style={{
        display: "grid",
        gap: 8,
        width: fullWidth ? "100%" : "auto",
        ...wrapperStyle,
      }}
    >
      {label ? (
        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{label}</span>
      ) : null}

      <input
        id={inputId}
        className={`input ${inputClassName}`.trim()}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {error ? (
        <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>
      ) : null}
    </label>
  );
}