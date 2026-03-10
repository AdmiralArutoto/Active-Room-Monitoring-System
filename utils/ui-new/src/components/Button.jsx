import React from "react";

export function PrimaryButton({ children, ...props }) {
  return (
    <button className="button button-primary" {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button className="button button-secondary" {...props}>
      {children}
    </button>
  );
}