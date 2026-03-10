import React from "react";
import AppShell from "../layout/AppShell";
import PageTitle from "../components/PageTitle";
import SearchFilterInput from "../components/SearchFilterInput";
import { PrimaryButton, SecondaryButton } from "../components/Button";
import TableShell from "../components/TableShell";
import StatusPill from "../components/StatusPill";

const rows = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  dateTime: "09/03/2026, 15:32:06",
  key: "B02.F01.R101.light",
  sensor: "light",
  value: i === 1 ? "OFF" : "ON",
}));

export default function LogsPage() {
  return (
    <AppShell>
      <PageTitle>Logs</PageTitle>

      <div
        className="toolbar"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <SearchFilterInput />
          <input className="date-input" placeholder="dd / mm / yyyy" />
          <input className="date-input" placeholder="dd / mm / yyyy" />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <PrimaryButton>Apply</PrimaryButton>
          <SecondaryButton>Clear</SecondaryButton>
        </div>
      </div>

      <TableShell>
        <table>
          <thead>
            <tr>
              <th>DATE / TIME</th>
              <th>KEY</th>
              <th>SENSOR</th>
              <th>VALUE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.dateTime}</td>
                <td>{row.key}</td>
                <td>{row.sensor}</td>
                <td><StatusPill value={row.value} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </AppShell>
  );
}