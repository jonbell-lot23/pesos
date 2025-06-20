"use client";

import { useState, useEffect, FormEvent } from "react";
import AdminDashboard from "./dashboard/page";
import ServerStatsPage from "../dashboard/server-stats/page";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (localStorage.getItem("adminAuth") === "true") {
      setAuthorized(true);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === "gnusgo!!") {
      setAuthorized(true);
      localStorage.setItem("adminAuth", "true");
    } else {
      alert("Incorrect password");
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
          <p className="mb-4">Enter admin password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 mr-2"
          />
          <button type="submit" className="bg-black text-white px-4 py-2">
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ServerStatsPage />
      <AdminDashboard />
    </div>
  );
}
