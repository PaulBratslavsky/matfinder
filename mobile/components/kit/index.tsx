/** Small building blocks of the Mat room look, all drawn from the theme tokens. */
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

export { RankBar } from './RankBar';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** A small caps label: kickers ("SUMMERLIN · 9.6 MI"), field labels, group headings. */
export function Label({ children, tone = 'secondary', size = 13, style }: { children: ReactNode; tone?: 'secondary' | 'red' | 'live' | 'text' | 'dim'; size?: number; style?: StyleProp<TextStyle> }) {
  const { colors, type } = useTheme();
  const color = { secondary: colors.textSecondary, red: colors.redText, live: colors.liveText, text: colors.text, dim: colors.textDim }[tone];
  return <Text style={[type.label, { fontSize: size, letterSpacing: size >= 13 ? 1.4 : 1, color }, style]}>{children}</Text>;
}

/** A section heading on a page: condensed 800 italic caps. */
export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return (
    <Text role="heading" aria-level={2} style={[styles.sectionTitle, style]}>
      {children}
    </Text>
  );
}

/** A white card on paper (light) or a raised card on ink (dark). */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

/**
 * A chip: `outline` (most), `solid` (inverse, for the strongest fact: "Visitors welcome") or `live`.
 */
export function Chip({ label, variant = 'outline', icon }: { label: string; variant?: 'outline' | 'solid' | 'live'; icon?: IconName }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = variant === 'solid' ? colors.bg : variant === 'live' ? '#FFFFFF' : colors.chipText;
  return (
    <View style={[styles.chip, variant === 'solid' && styles.chipSolid, variant === 'live' && styles.chipLive]}>
      {!!icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

/**
 * A big condensed button: `primary` is the red fill (one per screen), `outline` the secondary action.
 * The style is static, not a function of `pressed`: an expo-router `<Link asChild>` slot doesn't forward function
 * styles on the web.
 */
export function ActionButton({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  compact = false,
  style,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  icon?: IconName;
  variant?: 'primary' | 'outline';
  size?: 'md' | 'lg';
  /** Tighter type and padding, for two buttons side by side on a phone. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = variant === 'primary' ? colors.onRed : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={[styles.button, size === 'lg' && styles.buttonLg, compact && styles.buttonCompact, variant === 'outline' && styles.buttonOutline, props.disabled && styles.disabled, style]}>
      {!!icon && <Ionicons name={icon} size={compact ? 16 : 18} color={color} />}
      <Text numberOfLines={1} style={[styles.buttonText, size === 'lg' && styles.buttonTextLg, compact && styles.buttonTextCompact, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A round 40px icon button on a field-colored disc (refresh, share, back). */
export function RoundButton({ icon, label, onPress, children }: { icon?: IconName; label: string; onPress?: () => void; children?: ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={styles.round}>
      {children ?? (icon && <Ionicons name={icon} size={18} color={colors.text} />)}
    </Pressable>
  );
}

/** A thin progress track, for how far through the class on now is. */
export function Progress({ value, label }: { value: number; label: string }) {
  const styles = useStyles();
  return (
    <View role="progressbar" accessibilityLabel={label} style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  sectionTitle: { ...t.type.display, fontSize: 28, lineHeight: 30, color: t.colors.text, marginTop: 32, marginBottom: 12 },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.card,
    borderWidth: 1,
    borderColor: t.colors.surfaceBorder,
    boxShadow: `0 1px 2px ${t.colors.cardShadow}`,
  },
  cardPadded: { padding: 14 },
  chip: {
    height: 26,
    paddingHorizontal: 9,
    borderRadius: t.radii.chip,
    borderWidth: 1,
    borderColor: t.colors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipSolid: { backgroundColor: t.colors.inverse, borderColor: t.colors.inverse },
  chipLive: { backgroundColor: t.colors.liveFill, borderColor: t.colors.liveFill },
  chipText: { ...t.type.label, fontSize: 14, letterSpacing: 0.7 },
  button: {
    height: 50,
    borderRadius: t.radii.field,
    backgroundColor: t.colors.redFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  buttonLg: { height: 52 },
  buttonCompact: { paddingHorizontal: 8, gap: 6 },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.colors.outline },
  buttonText: { ...t.type.heavy, fontSize: 17, letterSpacing: 1 },
  buttonTextLg: { fontSize: 20, letterSpacing: 1.2 },
  buttonTextCompact: { fontSize: 15, letterSpacing: 0.6, flexShrink: 1 },
  disabled: { opacity: 0.5 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.field,
    borderWidth: 1,
    borderColor: t.scheme === 'light' ? t.colors.surfaceBorder : t.colors.fieldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 4, borderRadius: 2, backgroundColor: t.colors.separator, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: t.colors.live },
}));
