import React, { useState } from "react";
import AppShell from "../layout/AppShell";
import PageTitle from "../components/PageTitle";
import SearchFilterInput from "../components/SearchFilterInput";
import { PrimaryButton } from "../components/Button";
import TableShell from "../components/TableShell";
import StatusPill from "../components/StatusPill";
import ToggleSwitch from "../components/ToggleSwitch";

const rows = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  key: "B02.F01.R101.light",
  name: "light",
  sensor: "light",
  createdAt: "09/03/2026, 15:32:06",
  value: i % 2 === 0 ? "ON" : "OFF",
  active: i % 2 === 0,
}));

export default function SensorsPage() {
  const [items, setItems] = useState(rows);

  const toggleItem = (id, checked) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, active: checked } : item))
    );
  };

  return (
    <AppShell>
      <PageTitle>Sensors</PageTitle>

      <div className="toolbar">
        <SearchFilterInput />
        <PrimaryButton>Create Sensor</PrimaryButton>
      </div>

      <TableShell>
        <table>
          <thead>
            <tr>
              <th>KEY</th>
              <th>Name</th>
              <th>SENSOR</th>
              <th>CREATED AT</th>
              <th>VALUE</th>
              <th>ACTIVE</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.key}</td>
                <td>{row.name}</td>
                <td>{row.sensor}</td>
                <td>{row.createdAt}</td>
                <td><StatusPill value={row.value} /></td>
                <td>
                  <ToggleSwitch
                    checked={row.active}
                    onChange={(checked) => toggleItem(row.id, checked)}
                  />
                </td>
                <td style={{ color: "var(--action-off)", fontSize: 22 }}>🗑</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </AppShell>
  );
}