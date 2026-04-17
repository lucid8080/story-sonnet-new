import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        vividCoral: '#FF6B6B',
        skyBlue: '#4ECDC4',
        sunnyYellow: '#FFE66D',
        deepViolet: '#292F36',
        ghost: '#F0EFF4',
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
        drama: ['var(--font-playfair)', 'serif'],
        mono: ['var(--font-fira)', 'monospace'],
        miniMarquee: ['var(--font-mini-marquee)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '3xl': '2rem',
        '4xl': '3rem',
      },
    },
  },
  plugins: [typography],
};

export default config;
