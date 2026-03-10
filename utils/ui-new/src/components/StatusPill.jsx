import React from "react";

export default function StatusPill({ value }) {
  const on = String(value).toLowerCase() === "on";
  return (
    <span className={`status-pill ${on ? "status-pill--on" : "status-pill--off"}`}>
      {on ? "ON" : "OFF"}
    </span>
  );
}