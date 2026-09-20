import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Providers from "@/components/Providers";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: {
    default: "PDF Chat",
    template: "%s · PDF Chat",
  },
  description:
    "Upload a PDF and chat with it. Answers are grounded in the document and cite their source pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      {/* next-themes sets the class on <html> before paint, which React's
          hydration check would otherwise flag as a mismatch. */}
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            sans.variable,
            mono.variable,
            "min-h-screen bg-background font-sans text-foreground antialiased"
          )}
        >
          <Providers>
            <Toaster richColors position="top-center" />
            <NavBar />
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
