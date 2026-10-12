/**
 * ─────────────────────────────────────────────────────────────
 *  SDMCET LMS — "Heritage Navy & Ivory" theme
 *  Institutional · Premium · Timeless · Professional
 *
 *  Palette:
 *    Midnight navy    #102A3A  → sidebar, top nav, headings (slate 900/950)
 *    Institutional    #1734F4  → primary buttons, links, selected nav (blue)
 *    Warm ivory       #F5F2EA  → subtle page / landing backgrounds (slate 50/100)
 *    Muted brass      #B8A52A  → decorative accents, highlights (amber)
 *    Pure white       #FFFFFF  → tables, forms, content panels
 *
 *  Only the `slate`, `blue` and `amber` ramps are re-mapped so that every
 *  existing Tailwind class across the app inherits the palette automatically.
 *  Semantic status colors (emerald/rose/purple/sky) are intentionally left
 *  conventional so states like Approved/Rejected stay universally readable.
 * ─────────────────────────────────────────────────────────────
 */

/** Warm-ivory → midnight-navy neutral ramp (navy-tinted). */
const slate = {
  50: '#F6F3EC',   // warm ivory — subtle page backgrounds
  100: '#EDE9DF',  // ivory-100 — hovers on light
  200: '#DFDACD',  // warm border on light
  300: '#C7C3BA',
  400: '#9EA2A3',
  500: '#737C82',  // secondary text
  600: '#57646D',
  700: '#3E4E59',  // hover on dark surfaces
  800: '#273844',  // dark panels / borders on dark
  900: '#102A3A',  // MIDNIGHT NAVY — sidebar, topbar, dark surfaces
  950: '#0A1D29',  // deepest navy — dark-mode canvas
};

/**
 * Steel-blue ramp — "Steel blue #315B73 → primary actions and selected states".
 * (Replaces the previous deeper institutional blue.)
 */
const blue = {
  50: '#EDF3F6',
  100: '#D9E6EC',
  200: '#B4CBD6',
  300: '#8AABBC',
  400: '#5D8AA3',  // readable accent on navy (dark mode)
  500: '#3E7391',
  600: '#315B73',  // STEEL BLUE — primary buttons, links, selected nav
  700: '#27495C',  // hover / pressed
  800: '#1D3949',
  900: '#142935',
  950: '#0B1B25',
};

/** Warm muted-brass ramp (tan gold accent). */
const amber = {
  50: '#F7F1E7',
  100: '#F2E8D8',
  200: '#E8D6BC',
  300: '#D8BE97',
  400: '#C6A372',  // brass on dark surfaces
  500: '#B18A52',  // MUTED BRASS — decorative accents, highlights
  600: '#96733F',
  700: '#7A5C32',  // brass text on light
  800: '#5C4526',
  900: '#3E2E19',
  950: '#281C0F',
};

/** Sage green used alongside blue & brass in charts. */
const SAGE = '#6E9B7A';

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Re-map the default ramps to the Heritage palette.
        slate,
        blue,
        amber,
        // Semantic brand tokens (available for future use).
        'brand-navy': '#102A3A',
        'brand-blue': '#315B73',
        'brand-blue-hover': '#27495C',
        'brand-brass': '#B18A52',
        'brand-sage': SAGE,
        'brand-graphite': '#263238',  // main text
        'brand-charcoal': '#263238',
        'canvas': '#F5F2EA',
        'surface': '#FFFFFF',
        'success': '#6E9B7A',
        'warning': '#B18A52',
        'error': '#EF4444',
        'border': '#DFDACD',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
