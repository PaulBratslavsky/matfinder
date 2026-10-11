import { Text, View } from 'react-native';
import { Label } from '@/components/kit';
import type { SchoolPage } from '@/lib/api/schools';
import { money } from '@/lib/explore';
import { makeStyles } from '@/theme/ThemeProvider';

/** Drop-in, first class and monthly as big numbers, with the gym's notes under them. */
export function PriceTiles({ pricing }: { pricing: SchoolPage['pricing'] }) {
  const styles = useStyles();
  if (!pricing) return <Text style={styles.empty}>No pricing listed. Contact the gym.</Text>;
  const c = pricing.currency;
  const { monthlyMin: min, monthlyMax: max } = pricing;
  const monthly =
    min != null && max != null && min !== max ? `${money(min, c)}–${money(max, c).replace(/^\$/, '')}` : min != null || max != null ? money((min ?? max)!, c) : null;
  const tiles = [
    { value: pricing.dropInFee == null ? 'Ask' : pricing.dropInFee === 0 ? 'Free' : money(pricing.dropInFee, c), label: 'Drop-in' },
    ...(pricing.freeTrial ? [{ value: 'Free', label: 'First class' }] : []),
    { value: monthly ?? 'Ask', label: 'Monthly' },
  ];
  const notes = [pricing.dropInNotes, pricing.freeTrialNotes].filter(Boolean);
  return (
    <View style={styles.wrap}>
      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile}>
            {/* Smaller type for a long price range, so it fits a third of a phone screen. */}
            <Text style={[styles.value, tile.value.length > 5 && styles.valueLong]} numberOfLines={1}>
              {tile.value}
            </Text>
            <Label>{tile.label}</Label>
          </View>
        ))}
      </View>
      {notes.map((n) => (
        <Text key={n} style={styles.note}>
          {n}
        </Text>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { marginTop: 16, gap: 6 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 12, gap: 2, borderRadius: t.radii.field, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.surfaceBorder },
  value: { ...t.type.heavy, fontSize: 30, lineHeight: 32, color: t.colors.text },
  valueLong: { fontSize: 22 },
  note: { ...t.type.body, fontSize: 14, color: t.colors.textSecondary },
  empty: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary, marginTop: 16 },
}));
