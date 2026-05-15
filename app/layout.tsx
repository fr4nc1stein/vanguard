import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vanguard VDP — Vulnerability Disclosure Program",
  description: "Report security vulnerabilities responsibly to help us improve Vanguard VDP's security.",
  icons: {
    icon: [
      { url: '/apple-touch-icon.png' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider 
      afterSignOutUrl="/" 
      signInUrl="/sign-in" 
      signUpUrl="/sign-up"
    >
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
        </head>
        <body className="antialiased" style={{ fontFamily: "'Geist', system-ui, sans-serif" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
