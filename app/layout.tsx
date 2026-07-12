import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = DM_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDF Ingestion Dashboard",
  description: "Upload PDFs and track ingestion jobs in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <TooltipProvider>
            <Providers>{children}</Providers>
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
