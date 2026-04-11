import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Compass, Heart, HelpCircle } from 'lucide-react';
import { BRAND } from '@/lib/brand';

const linkClass =
  'rounded-sm text-neutral-700 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50';

const btnPrimary =
  'inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const btnSecondary =
  'inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-neutral-200 bg-white/80 px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2';

function FooterNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200/80 bg-neutral-50 text-neutral-700">
      <section
        className="border-b border-neutral-200/60 bg-gradient-to-b from-amber-50/90 via-rose-50/50 to-sky-50/40"
        aria-labelledby="footer-cta-heading"
      >
        <div className="mx-auto max-w-7xl px-6 py-14 sm:py-16">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <h2
              id="footer-cta-heading"
              className="font-drama text-2xl font-semibold leading-snug tracking-tight text-neutral-900 sm:text-3xl"
            >
              Tiny stories for bedtime, quiet time, and car rides.
            </h2>
            <p className="text-sm text-neutral-600 sm:text-base">
              One calm place to browse—pick a story and press play.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/library" className={btnPrimary}>
                Browse Library
              </Link>
              <Link href="/pricing" className={btnSecondary}>
                Start Listening
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <section
            className="space-y-4"
            aria-labelledby="footer-brand-heading"
          >
            <div className="flex items-center gap-0.5">
              <Image
                src="/branding/logo.png"
                alt=""
                width={120}
                height={40}
                className="h-10 w-auto max-w-[120px] object-contain object-left"
              />
              <h2
                id="footer-brand-heading"
                className="text-2xl font-black tracking-tight text-slate-900"
              >
                {BRAND.productName}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-neutral-700">
              Cozy audio stories designed for calm, easy listening—at bedtime,
              on the go, or anytime.
            </p>
            <p className="text-xs font-medium text-neutral-500">
              Made for families
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="footer-explore-label">
            <h2
              id="footer-explore-label"
              className="flex items-center gap-2 text-sm font-semibold text-neutral-900"
            >
              <Compass className="h-4 w-4 text-primary" aria-hidden />
              Explore
            </h2>
            <nav aria-label="Explore Sozo Play" className="flex flex-col space-y-3 text-sm">
              <FooterNavLink href="/library">Library</FooterNavLink>
              <FooterNavLink href="/pricing">Pricing</FooterNavLink>
              <FooterNavLink href="/library?sort=new">New Stories</FooterNavLink>
              <FooterNavLink href="/library?sort=popular">
                Popular Stories
              </FooterNavLink>
            </nav>
          </section>

          <section className="space-y-4" aria-labelledby="footer-browse-label">
            <h2
              id="footer-browse-label"
              className="flex items-center gap-2 text-sm font-semibold text-neutral-900"
            >
              <BookOpen className="h-4 w-4 text-primary" aria-hidden />
              Browse
            </h2>
            <nav
              aria-label="Browse stories by age and topic"
              className="flex flex-col space-y-3 text-sm"
            >
              <FooterNavLink href="/library?age=3-5">Ages 3–5</FooterNavLink>
              <FooterNavLink href="/library?age=6-8">Ages 6–8</FooterNavLink>
              <FooterNavLink href="/library?mood=bedtime">
                Bedtime Stories
              </FooterNavLink>
              <FooterNavLink href="/library?genre=funny">Funny Stories</FooterNavLink>
              <FooterNavLink href="/library?genre=adventure">
                Adventure Stories
              </FooterNavLink>
            </nav>
          </section>

          <section className="space-y-4" aria-labelledby="footer-help-label">
            <h2
              id="footer-help-label"
              className="flex items-center gap-2 text-sm font-semibold text-neutral-900"
            >
              <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
              Help
            </h2>
            <nav aria-label="Help and account" className="flex flex-col space-y-3 text-sm">
              <FooterNavLink href="/how-it-works">How it Works</FooterNavLink>
              <FooterNavLink href="/pricing">Membership</FooterNavLink>
              <FooterNavLink href="/faq">FAQ</FooterNavLink>
              <FooterNavLink href="/contact">Contact</FooterNavLink>
              <FooterNavLink href="/login">Log in</FooterNavLink>
              <FooterNavLink href="/signup">Sign up</FooterNavLink>
            </nav>
          </section>
        </div>

        <div
          className="flex flex-col gap-4 border-t border-neutral-200 pt-8 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          aria-label="Legal and trust"
        >
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <FooterNavLink href="/privacy">Privacy Policy</FooterNavLink>
            <FooterNavLink href="/terms">Terms of Service</FooterNavLink>
            <FooterNavLink href="/accessibility">Accessibility</FooterNavLink>
          </div>
          <p className="flex items-center gap-2 text-neutral-600">
            <Heart
              className="h-4 w-4 shrink-0 text-primary/80"
              aria-hidden
            />
            <span>Secure payments powered by Stripe</span>
          </p>
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-neutral-100/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {BRAND.productName}</p>
          <p className="text-neutral-500">Made for cozy listening</p>
        </div>
      </div>
    </footer>
  );
}
