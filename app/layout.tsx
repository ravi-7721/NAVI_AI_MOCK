import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Ai Mock Interrview App",
  description: "An Ai-powered platform for Preparing for mock interviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark ">
      <body className="antialiased pattern">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
