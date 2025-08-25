import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/features/themes/theme-provider";
import { ThemeScript } from "@/components/features/themes/theme-script";
import SessionProvider from "@/components/root/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SparkCode",
  description: "SparkCode is an innovative AI-powered coding platform that helps developers practice coding, analyze code quality, generate comprehensive test cases, and execute solutions with real-time feedback. Enhance your programming skills and ace technical interviews with intelligent AI assistance and multi-language support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ThemeScript />
          <ThemeProvider
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
