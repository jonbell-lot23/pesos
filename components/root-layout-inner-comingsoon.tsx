"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import UsernameModal from "./username-modal";
import { NextFont } from "next/dist/compiled/@next/font";

interface RootLayoutInnerProps {
  children: React.ReactNode;
  inter: NextFont;
}

export function RootLayoutInnerComingSoon({
  children,
  inter,
}: RootLayoutInnerProps) {
  const { user } = useUser();
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  return (
    <div
      className={`${inter.className} min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col`}
    >
      <header className="bg-white shadow-sm"></header>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
