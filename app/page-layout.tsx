// page-layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { RootLayoutInnerComingSoon } from "../components/root-layout-inner-comingsoon";

const inter = Inter({ subsets: ["latin"] });

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={inter.className}>
      <RootLayoutInnerComingSoon inter={inter}>
        {children}
      </RootLayoutInnerComingSoon>
    </div>
  );
}
