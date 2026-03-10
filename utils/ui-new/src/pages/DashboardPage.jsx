import React, { useState } from "react";
import AppShell from "../layout/AppShell";
import PageTitle from "../components/PageTitle";
import Card from "../components/Card";
import SelectInput from "../components/SelectInput";
import AreaTabs from "../components/AreaTabs";

export default function DashboardPage() {
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [activeTab, setActiveTab] = useState("ROOM");

  const options = [
    { value: "1", label: "List Room code" },
    { value: "2", label: "List Room code" },
    { value: "3", label: "List Room code" },
  ];

  return (
    <AppShell>
      <PageTitle>Dashboard</PageTitle>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 20,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Site Name</div>
        </div>

        <SelectInput value={building} onChange={(e) => setBuilding(e.target.value)} options={options} placeholder="Building" />
        <SelectInput value={floor} onChange={(e) => setFloor(e.target.value)} options={options} placeholder="Floor" />
        <SelectInput value={room} onChange={(e) => setRoom(e.target.value)} options={options} placeholder="Room" />
      </div>

      <Card
        style={{
          height: 470,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        + Click To Add Site
      </Card>

      <Card>
        <AreaTabs activeTab={activeTab} onChange={setActiveTab} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            minHeight: 150,
          }}
        >
          <div style={{ padding: 16, borderRight: "1px solid var(--border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", rowGap: 8 }}>
              <strong>Name</strong><span>Lecture hall</span>
              <strong>Code</strong><span>R102</span>
              <strong>Created</strong><span>08/03/2026 - 15:30:12</span>
              <strong>Active</strong><span>Yes</span>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Sensors</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div><span style={{ color: "var(--sensor-on)" }}>●</span> B02.F01.R101.light</div>
              <div><span style={{ color: "var(--sensor-idle)" }}>●</span> B02.F01.R101.motion</div>
            </div>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}