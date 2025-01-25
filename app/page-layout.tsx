import "./globals.css";
import { Inter } from "next/font/google";
import { RootLayoutInnerComingSoon } from "../components/root-layout-inner-comingsoon";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PESOS.site - Save Your Stuff",
  description: "Save your stuff by backing up your RSS feeds",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootLayoutInnerComingSoon inter={inter}>
          {children}
        </RootLayoutInnerComingSoon>
      </body>
    </html>
  );
}
