import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--page-bg)" }}>
      <Sidebar collapsed={collapsed} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Topbar onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main style={{ padding: "24px 32px 32px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}