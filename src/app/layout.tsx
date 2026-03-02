import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NDKProvider } from "@/providers/NDKProvider";
import { ToastContainer } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tell it! - Whatever it is, just Tell It.",
  description: "A decentralized microblogging platform built on Nostr. Whatever it is, just Tell It.",
  metadataBase: new URL("https://tellit.id"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NDKProvider>
          {children}
          <ToastContainer />
        </NDKProvider>
      </body>
    </html>
  );
}
