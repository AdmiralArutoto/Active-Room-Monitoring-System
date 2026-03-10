import React from "react";

const navItems = [
  { label: "Home" },
  { label: "Dashboard", active: true },
  { label: "Areas" },
  { label: "Sensors" },
  { label: "Logs" },
];

export default function Sidebar({ collapsed }) {
  return (
    <aside
      style={{
        width: collapsed ? 88 : 250,
        background: "#F3F3F3",
        borderRight: "1px solid var(--border)",
        transition: "width 0.2s ease",
        paddingTop: 20,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 22,
          padding: "8px 24px 24px",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        BRAND NAME
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 8px" }}>
        {navItems.map((item) => (
          <button
            key={item.label}
            style={{
              height: 42,
              border: 0,
              borderRadius: 10,
              background: item.active ? "#E9E9E9" : "transparent",
              textAlign: "left",
              padding: "0 16px",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            {collapsed ? item.label[0] : item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}