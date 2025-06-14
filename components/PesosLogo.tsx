"use client";
import React from "react";

export default function PesosLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="15" fill="#00AA55" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fill="white"
        fontWeight="bold"
      >
        P
      </text>
    </svg>
  );
}
