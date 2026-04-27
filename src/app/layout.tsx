import type { Metadata } from 'next';
import { Outfit, Playfair_Display, Fira_Code, VT323 } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import SiteHeader from '@/components/layout/SiteHeader';
import BottomStoryPlayerBar from '@/components/layout/BottomStoryPlayerBar';
import { ActiveCampaignBarGate } from '@/components/campaigns/ActiveCampaignBarGate';
import Footer from '@/components/layout/Footer';
import { BRAND } from '@/lib/brand';

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

/** Header story mini player — retro grid / terminal (Google Fonts). */
const miniMarquee = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mini-marquee',
  display: 'swap',
});

export const metadata: Metadata = {
  title: BRAND.productName,
  description: BRAND.description,
  applicationName: BRAND.productName,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  icons: {
    icon: [
      {
        url: '/branding/favicon/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
  openGraph: {
    title: BRAND.productName,
    description: BRAND.description,
    siteName: BRAND.productName,
    type: 'website',
    images: ['/branding/logo_display.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.productName,
    description: BRAND.description,
    images: ['/branding/logo_display.webp'],
  },
  manifest: '/branding/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${playfair.variable} ${fira.variable} ${miniMarquee.variable}`}
    >
      <body className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-sky-50 font-sans text-slate-800 antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <ActiveCampaignBarGate />
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <BottomStoryPlayerBar />
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
