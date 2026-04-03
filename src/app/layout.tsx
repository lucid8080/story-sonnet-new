import type { Metadata } from 'next';
import { Outfit, Playfair_Display, Fira_Code } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import SiteHeader from '@/components/layout/SiteHeader';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const fira = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Story Sonnet',
  description: 'Story worlds made for listening',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${playfair.variable} ${fira.variable}`}
    >
      <body className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-sky-50 font-sans text-slate-800 antialiased">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
