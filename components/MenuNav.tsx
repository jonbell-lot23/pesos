"use client";
import { useState } from "react";
import Link from "next/link";

export default function MenuNav() {
  const [open, setOpen] = useState(false);
  const navItems = [
    { href: "/setup", label: "Setup" },
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <div className="relative">
      <button
        className="text-gray-600"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Menu
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-md flex flex-col">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
