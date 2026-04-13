/**
 * Pastel-inspired swatches for campaign top bars (see https://colorhunt.co/palettes/pastel).
 * Curated as single background colors; not scraped from the site at runtime.
 */
export type PastelBarPreset = { id: string; label: string; hex: string };

export const PASTEL_BAR_PRESETS: PastelBarPreset[] = [
  { id: 'blush', label: 'Blush', hex: '#FFD5E5' },
  { id: 'peach', label: 'Peach', hex: '#FFDAC1' },
  { id: 'butter', label: 'Butter', hex: '#FFF5BA' },
  { id: 'mint', label: 'Mint', hex: '#C7F5D9' },
  { id: 'seafoam', label: 'Seafoam', hex: '#B8E0D2' },
  { id: 'sky', label: 'Sky', hex: '#C4E7FF' },
  { id: 'periwinkle', label: 'Periwinkle', hex: '#D4DCFF' },
  { id: 'lavender', label: 'Lavender', hex: '#E8D5F2' },
  { id: 'lilac', label: 'Lilac', hex: '#E6D9FF' },
  { id: 'powder', label: 'Powder', hex: '#E8F4F8' },
  { id: 'rose', label: 'Rose', hex: '#F8C8DC' },
  { id: 'apricot', label: 'Apricot', hex: '#FFD6A5' },
  { id: 'sage', label: 'Sage', hex: '#D8E2C8' },
  { id: 'ice', label: 'Ice', hex: '#D6EFFF' },
];
