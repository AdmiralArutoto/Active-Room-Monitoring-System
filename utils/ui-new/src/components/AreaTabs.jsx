import React from "react";

const tabs = ["BUILDING", "FLOOR", "ROOM"];

export default function AreaTabs({ activeTab, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            height: 38,
            padding: "0 18px",
            border: 0,
            borderRight: "1px solid var(--border)",
            background: activeTab === tab ? "#EFEFEF" : "#F7F7F7",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}