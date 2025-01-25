import React from "react";

export default function AlternateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "20px", backgroundColor: "#f0f0f0" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1>Alternate Layout</h1>
      </header>
      <main>{children}</main>
      <footer style={{ marginTop: "20px" }}>
        <p>Alternate Footer</p>
      </footer>
    </div>
  );
}
