import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { SchoolPage } from '@/lib/api/schools';
import { EmptyLine } from './Section';

const money = (n: number, currency: string) => `${currency === 'USD' ? '$' : `${currency} `}${Number.isInteger(n) ? n : n.toFixed(2)}`;

function Row({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <View className="flex-row justify-between gap-4 py-1">
      <Text className="text-sm">{label}</Text>
      <View className="flex-1 items-end">
        <Text className="text-sm font-medium">{value}</Text>
        {!!note && <Text variant="muted" className="text-right">{note}</Text>}
      </View>
    </View>
  );
}

export function PricingCard({ pricing }: { pricing: SchoolPage['pricing'] }) {
  if (!pricing) return <EmptyLine>No pricing listed. Contact the school.</EmptyLine>;
  const c = pricing.currency;
  const monthly =
    pricing.monthlyMin != null && pricing.monthlyMax != null && pricing.monthlyMin !== pricing.monthlyMax
      ? `${money(pricing.monthlyMin, c)}–${money(pricing.monthlyMax, c)} / month`
      : pricing.monthlyMin != null || pricing.monthlyMax != null
        ? `${money((pricing.monthlyMin ?? pricing.monthlyMax)!, c)} / month`
        : 'Ask the school';
  return (
    <View className="rounded-xl border border-border p-3">
      <Row label="Visitors" value={pricing.visitorsWelcome ? 'Welcome' : 'Members only'} />
      <Row
        label="Drop-in"
        value={pricing.dropInFee == null ? 'Ask the school' : pricing.dropInFee === 0 ? 'Free' : money(pricing.dropInFee, c)}
        note={pricing.dropInNotes}
      />
      <Row label="Free trial" value={pricing.freeTrial ? 'Yes' : 'No'} note={pricing.freeTrialNotes} />
      <Row label="Membership" value={monthly} />
    </View>
  );
}
