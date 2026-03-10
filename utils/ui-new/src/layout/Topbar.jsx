import React from "react";

export default function Topbar({ onToggleSidebar }) {
  return (
    <header
      style={{
        height: 66,
        background: "#F3F3F3",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
      }}
    >
      <button className="icon-button" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        ☰
      </button>

      <button
        className="button"
        style={{
          background: "#E9E9E9",
          color: "var(--text-primary)",
          borderRadius: 10,
          padding: "0 18px",
        }}
      >
        UserName
      </button>
    </header>
  );
}