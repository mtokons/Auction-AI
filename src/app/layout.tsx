import type { Metadata } from 'next';
import { Syne, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PropClear — German Real Estate AI Analysis',
  description:
    'AI-powered analysis of German auction properties. Investment scores, legal term decoding, transport analysis, market outlook, and KT Bank Islamic finance eligibility.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${jetbrains.variable}`}>
      <body className="bg-cream text-ink font-syne antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
