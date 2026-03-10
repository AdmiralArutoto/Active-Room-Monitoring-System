import React from "react";
import Card from "./Card";

export default function TableShell({ children }) {
  return (
    <Card className="table-shell" style={{ overflow: "hidden" }}>
      <div className="table-shell">{children}</div>
    </Card>
  );
}