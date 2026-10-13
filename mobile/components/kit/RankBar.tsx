import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { rankBar } from '@/theme/tokens';

/**
 * The black belt's red rank bar with white stripes: the app's mark. On cards one stripe stands for each class left
 * today; elsewhere it's decoration. Decorative for screen readers: the text next to it says the same thing.
 */
export function RankBar({
  stripes,
  width = 52,
  height = 12,
  barWidth,
  belt = rankBar.belt,
  bar: barColor = rankBar.onBlack,
  ring,
  style,
}: {
  stripes: number;
  /** A number, or a percentage with `barWidth` set. */
  width?: number | `${number}%`;
  height?: number;
  barWidth?: number;
  /** Belt colors (coral belts have two) and the rank bar's color; a black belt with a red bar by default. */
  belt?: string | string[];
  bar?: string;
  /** Border color; defaults to the theme's belt ring (dark mode only). */
  ring?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const bar = barWidth ?? Math.round((typeof width === 'number' ? width : 100) * 0.35);
  const tail = Math.round(bar * 0.35);
  const stripe = Math.max(2, Math.round(height / 5));
  const border = ring ?? colors.beltRing;
  const beltColors = Array.isArray(belt) ? belt : [belt];
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          flexDirection: 'row',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: beltColors[0],
          borderWidth: border === 'transparent' ? 0 : 1,
          borderColor: border,
        },
        style,
      ]}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {beltColors.length > 1 && beltColors.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
      </View>
      <View style={{ width: bar, backgroundColor: barColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: stripe + 1 }}>
        {Array.from({ length: Math.min(stripes, 4) }, (_, i) => (
          <View key={i} style={{ width: stripe, height: '100%', backgroundColor: rankBar.stripe }} />
        ))}
      </View>
      <View style={{ width: tail, backgroundColor: beltColors[beltColors.length - 1] }} />
    </View>
  );
}
