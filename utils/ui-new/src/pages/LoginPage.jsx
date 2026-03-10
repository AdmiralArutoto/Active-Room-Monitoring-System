import React from "react";

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 72,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        BRAND NAME
      </div>

      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div
          className="card"
          style={{
            width: 330,
            padding: 24,
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span>Username</span>
              <input className="input" placeholder="Value" />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span>Password</span>
              <input className="input" placeholder="Value" type="password" />
            </label>

            <button className="button button-primary">Log In</button>
          </div>
        </div>
      </div>
    </div>
  );
}