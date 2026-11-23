import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "LUMA CAPDIT Studio Presets",
  title: {
    default: "LUMA CAPDIT Studio Presets",
    template: "%s · LUMA CAPDIT Studio Presets",
  },
  description:
    "Analyze your photo, pick a film simulation, and download a real, validated Lightroom XMP preset tuned to that image.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster
            theme="light"
            position="top-right"
            closeButton
            toastOptions={{
              style: {
                background: "#ffffff",
                border: "1px solid rgba(13,13,13,0.09)",
                color: "#0d0d0d",
                borderRadius: "14px",
                boxShadow: "0 16px 40px -20px rgba(13,13,13,0.28)",
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
