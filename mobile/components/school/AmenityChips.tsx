import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import type { AmenityKey, SchoolPage } from '@/lib/api/schools';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

const AMENITIES: Record<AmenityKey, { label: string; icon: ComponentProps<typeof Ionicons>['name'] }> = {
  showers: { label: 'Showers', icon: 'water-outline' },
  changingRooms: { label: 'Changing rooms', icon: 'shirt-outline' },
  parking: { label: 'Parking', icon: 'car-outline' },
  giRental: { label: 'Gi rental', icon: 'pricetag-outline' },
  proShop: { label: 'Pro shop', icon: 'bag-handle-outline' },
  kidsArea: { label: 'Kids area', icon: 'happy-outline' },
  airConditioning: { label: 'A/C', icon: 'snow-outline' },
};

/** What's in the gym, as icon chips. */
export function AmenityChips({ amenities }: { amenities: SchoolPage['amenities'] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const available = (Object.keys(AMENITIES) as AmenityKey[]).filter((k) => amenities?.[k]);
  if (!available.length) return <Text style={styles.empty}>No amenities listed.</Text>;
  return (
    <View style={styles.row}>
      {available.map((k) => (
        <View key={k} style={styles.chip}>
          <Ionicons name={AMENITIES[k].icon} size={15} color={colors.text} />
          <Text style={styles.text}>{AMENITIES[k].label}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: t.radii.control,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  text: { ...t.type.label, fontSize: 15, letterSpacing: 0.6, color: t.colors.text },
  empty: { ...t.type.body, fontSize: 15, color: t.colors.textSecondary },
}));
