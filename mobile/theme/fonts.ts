import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_800ExtraBold_Italic } from '@expo-google-fonts/barlow-condensed/800ExtraBold_Italic';
import type { FontFamily } from './tokens';

/**
 * The font files behind `fonts` in tokens.ts, loaded by `useFonts` in app/_layout.tsx. Only these weights ship.
 * To change typeface: install its @expo-google-fonts package, import the weights here and rename them in tokens.ts.
 */
export const fontFiles: Record<FontFamily, number> = {
  BarlowCondensed_800ExtraBold_Italic,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_700Bold,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
};
