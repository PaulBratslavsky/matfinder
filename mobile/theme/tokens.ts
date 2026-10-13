/**
 * MatFinder design tokens: Direction B, "Mat room" (light "paper" and dark "ink").
 *
 * This is the one file to edit to change how the app looks. Every screen reads these values, through `useTheme()` /
 * `makeStyles()` for StyleSheet code and through CSS variables (see `theme/css-vars.ts`) for the React Native
 * Reusables components in `components/ui`. Change a color here and both paths follow.
 *
 * Contrast notes come from the design's token board (WCAG 2.x against the surface each token sits on);
 * `theme/tokens.test.ts` re-checks the text colors, so a change that makes text unreadable fails the unit tests.
 */
import type { BeltRank } from '@/lib/api/schools';

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  // Surfaces
  /** Page and map backdrop. */
  bg: string;
  /** Bottom sheet. Light: the same paper as `bg`, with cards on it in white. */
  sheet: string;
  /** Cards, tiles. */
  surface: string;
  /** Card border. Dark cards have none, so it matches `surface`. */
  surfaceBorder: string;
  /** Search field and round icon buttons. */
  field: string;
  fieldBorder: string;
  /** Map controls floating over the map. */
  overlay: string;

  // Text
  text: string;
  /** Meta lines, labels. */
  textSecondary: string;
  /** Past classes, placeholders. Not on `separator` fills. */
  textDim: string;
  /** Outlined chip labels. */
  chipText: string;

  // Lines
  /** Hairlines, empty week cells, progress tracks. Decorative. */
  separator: string;
  /** Chip and secondary button borders. */
  outline: string;
  /** Bottom sheet grab handle. */
  handle: string;

  // Brand red
  /** Pins, rank bars, dots: graphics only, never under small text. */
  red: string;
  /** Behind white text: active filter, Today, primary button. */
  redFill: string;
  /** Red text and icons. */
  redText: string;
  /** A highlighted row (the next class today). */
  redTint: string;
  /** Text on `redFill`. */
  onRed: string;

  // Status
  /** The "On now" dot and progress bar; always next to an "On now" label. */
  live: string;
  /** "On now" text and its group label. */
  liveText: string;
  /** Behind white text: the ON NOW pin tag, checklist ticks. */
  liveFill: string;
  /** The soft ring around a live dot or pin. */
  liveGlow: string;
  /** Inverse of `text`: start-time tags on pins, the active sort toggle. */
  inverse: string;
  onInverse: string;
  /** A schedule verified more than 90 days ago. */
  warning: string;
  warningBg: string;

  // Map
  pin: string;
  pinBorder: string;
  /** Schools with nothing left today. */
  pinMuted: string;
  pinMutedBorder: string;
  /** The halo behind the selected pin. */
  pinHalo: string;

  // Effects
  /** Floating things: the sheet, map controls, pin tags. */
  shadow: string;
  /** Light cards get a 2px shadow; dark cards none. */
  cardShadow: string;
  /** A 1px ring around black belts and rank bars, so they read on dark surfaces. */
  beltRing: string;
};

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#F4F1EA',
    sheet: '#F4F1EA',
    surface: '#FFFFFF',
    surfaceBorder: '#E7E1D5',
    field: '#FFFFFF',
    fieldBorder: '#DCD5C7',
    overlay: 'rgba(255,255,255,0.97)',

    text: '#141518',
    textSecondary: '#5C5F66',
    textDim: '#6B6E75',
    chipText: '#3A3C41',

    separator: '#E4DED2',
    outline: '#C9C1B1',
    handle: '#CFC8BA',

    red: '#E5312B',
    redFill: '#D02621',
    redText: '#C0201A',
    redTint: 'rgba(229,49,43,0.08)',
    onRed: '#FFFFFF',

    live: '#22A447',
    liveText: '#1E7A34',
    liveFill: '#1E7A34',
    liveGlow: 'rgba(34,164,71,0.28)',
    inverse: '#141518',
    onInverse: '#FFFFFF',
    warning: '#8A5300',
    warningBg: '#FFF4DC',

    pin: '#E5312B',
    pinBorder: '#FFFFFF',
    pinMuted: '#B3AC9E',
    pinMutedBorder: '#FFFFFF',
    pinHalo: 'rgba(229,49,43,0.24)',

    shadow: 'rgba(20,21,24,0.16)',
    cardShadow: 'rgba(20,21,24,0.06)',
    beltRing: 'transparent',
  },
  dark: {
    bg: '#131518',
    sheet: '#17181B',
    surface: '#202227',
    surfaceBorder: '#202227',
    field: '#24262B',
    fieldBorder: '#24262B',
    overlay: 'rgba(23,24,27,0.94)',

    text: '#F5F2EA',
    textSecondary: '#A3A7AE',
    textDim: '#8B9098',
    chipText: '#D9D5CC',

    separator: '#2C2F35',
    outline: '#3A3D44',
    handle: '#3A3D44',

    red: '#E5312B',
    redFill: '#D02621',
    redText: '#FF5A4F',
    redTint: 'rgba(229,49,43,0.14)',
    onRed: '#FFFFFF',

    live: '#34C759',
    liveText: '#5BD27A',
    liveFill: '#1E7A34',
    liveGlow: 'rgba(52,199,89,0.32)',
    inverse: '#F5F2EA',
    onInverse: '#131518',
    warning: '#FFC15A',
    warningBg: '#2A2418',

    pin: '#E5312B',
    pinBorder: '#F5F2EA',
    pinMuted: '#4A4E56',
    pinMutedBorder: '#8B9098',
    pinHalo: 'rgba(229,49,43,0.30)',

    shadow: 'rgba(0,0,0,0.45)',
    cardShadow: 'transparent',
    beltRing: '#3A3D44',
  },
};

/**
 * Base map under the pins: monochrome, so the red pins and the green ON NOW tag are the only color on the map.
 * To use a custom style (a warmer "paper" from Mapbox Studio, say), paste its `mapbox://styles/<user>/<id>` URL here.
 */
export const mapStyles: Record<ColorScheme, string> = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
};

/**
 * Font families. Each name must have a font file in `theme/fonts.ts` (TypeScript enforces it), which `useFonts`
 * loads at startup. Custom fonts carry their weight in the family: use these instead of `fontWeight`.
 * `tailwind.config.js` repeats them for the `font-*` classes (a unit test keeps the two in step).
 */
export const fonts = {
  /** Titles: Barlow Condensed 800 italic, uppercase. */
  display: 'BarlowCondensed_800ExtraBold_Italic',
  /** Big numbers, buttons, group labels. */
  heavy: 'BarlowCondensed_800ExtraBold',
  /** Labels, chips, small caps. */
  label: 'BarlowCondensed_700Bold',
  /** Body and meta lines. */
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemibold: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
} as const;

export type FontFamily = (typeof fonts)[keyof typeof fonts];

/** Corner radii, smallest to largest. */
export const radii = {
  /** Chips and tags. */
  chip: 5,
  /** Filter buttons, week-grid cells. */
  control: 8,
  /** Fields, buttons, map controls. */
  field: 12,
  card: 14,
  /** The next-session block on the school page. */
  section: 16,
  sheet: 24,
  round: 999,
} as const;

/** Layout constants. */
export const layout = {
  /** Side gutter of every screen. */
  gutter: 16,
  /** Share of the screen the Explore sheet covers when the map is shown. */
  sheetFraction: 0.56,
  /** The widest a page's content gets on a large screen. */
  maxContentWidth: 640,
} as const;

/** Belt colors: the same in both modes. Coral belts list both colors. */
export const belts: Record<BeltRank, { label: string; colors: string[] }> = {
  white: { label: 'White belt', colors: ['#FFFFFF'] },
  blue: { label: 'Blue belt', colors: ['#2D6BEA'] },
  purple: { label: 'Purple belt', colors: ['#7B3FE4'] },
  brown: { label: 'Brown belt', colors: ['#8A5A2E'] },
  black: { label: 'Black belt', colors: ['#0B0B0C'] },
  red_black: { label: 'Red and black belt', colors: ['#E5312B', '#0B0B0C'] },
  red_white: { label: 'Red and white belt', colors: ['#E5312B', '#FFFFFF'] },
  red: { label: 'Red belt', colors: ['#E5312B'] },
};

/** The rank bar on a belt: red on black belts, black on the others; degree stripes are white. */
export const rankBar = { onBlack: '#E5312B', onOthers: '#0B0B0C', stripe: '#FFFFFF', belt: '#0B0B0C' } as const;
/** The user's location dot (both modes). */
export const userDot = { fill: '#2D6BEA' } as const;
