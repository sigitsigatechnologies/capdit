import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CAPDIT — Photo to Lightroom Preset",
  description:
    "Upload a photograph, measure its brightness and color in the browser, and download a Lightroom XMP preset tuned to that photo.",
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
                border: "1px solid rgba(17,17,20,0.08)",
                color: "#111114",
                borderRadius: "14px",
                boxShadow: "0 12px 32px -12px rgba(17,17,20,0.25)",
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
