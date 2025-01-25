import "./globals.css";
import { Inter } from "next/font/google";
import { RootLayoutInner } from "../components/root-layout-inner";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Pasos - RSS Feed Aggregator",
  description: "Simplify your content streams with Pasos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider frontendApi={process.env.CLERK_FRONTEND_API}>
          <RootLayoutInner inter={inter}>{children}</RootLayoutInner>
        </ClerkProvider>
      </body>
    </html>
  );
}
