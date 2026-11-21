import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Capdit Studio — AI Photo & Video Editor",
  description:
    "A local-first creative studio for editing photos and videos in your browser with real-time color grading, timeline editing, text, audio and export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            closeButton
            toastOptions={{
              style: {
                background: "#161923",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#f2f4f8",
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
