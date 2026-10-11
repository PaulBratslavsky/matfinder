import { Text, View } from 'react-native';
import type { PinTone } from '@/lib/explore';
import { makeStyles } from '@/theme/ThemeProvider';

const PIN = 26;
const PIN_SELECTED = 36;
const PIN_MUTED = 18;
/** The soft ring around a live pin and the halo around the selected one. */
const GLOW = 40;
const HALO = 60;
const TAG = 20;
const TAG_SELECTED = 22;
/** Space between a tag and the top of its pin. */
const GAP = 6;
export const PIN_WIDTH = 84;

/**
 * Where the pin's center sits inside the marker view, so the map can anchor that point (not the view's corner)
 * on the school's coordinates: `centerY` px from the top of a `height` px view.
 */
export function pinGeometry(tone: PinTone, selected: boolean, tagText?: string | null): { height: number; centerY: number; box: number; pin: number; tagTop: number | null } {
  const pin = selected ? PIN_SELECTED : tone === 'muted' ? PIN_MUTED : PIN;
  const box = selected ? HALO : tone === 'live' ? GLOW : pin;
  const tag = !tagText || (tone === 'muted' && !selected) ? 0 : selected ? TAG_SELECTED : TAG;
  const pinTop = (box - pin) / 2;
  const extraTop = tag ? Math.max(0, tag + GAP - pinTop) : 0;
  return { height: extraTop + box, centerY: extraTop + box / 2, box, pin, tagTop: tag ? extraTop + pinTop - GAP - tag : null };
}

/**
 * A school on the map: red with its start time (or a green ON NOW tag) when it has a class today, small and
 * muted when it has nothing left today, larger with a halo when selected. `dimmed` fades it while another is selected.
 */
export function MapPin({ tone, tag, selected = false, dimmed = false }: { tone: PinTone; tag?: string | null; selected?: boolean; dimmed?: boolean }) {
  const styles = useStyles();
  const g = pinGeometry(tone, selected, tag);
  const muted = tone === 'muted';
  return (
    <View pointerEvents="box-none" style={[styles.container, { height: g.height, opacity: dimmed ? 0.45 : 1 }]}>
      {g.tagTop != null && (
        <View style={[styles.tagRow, { top: g.tagTop }]}>
          <View style={[styles.tag, selected && styles.tagSelected, tone === 'live' ? styles.tagLive : styles.tagTime]}>
            {tone === 'live' && <View style={styles.tagDot} />}
            <Text numberOfLines={1} style={[styles.tagText, selected && styles.tagTextSelected, tone === 'live' ? styles.tagTextLive : styles.tagTextTime]}>
              {tag}
            </Text>
          </View>
        </View>
      )}
      <View style={[styles.box, { top: g.height - g.box, width: g.box, height: g.box, borderRadius: g.box / 2 }, selected ? styles.halo : tone === 'live' && styles.glow]}>
        <View
          style={[
            styles.pin,
            { width: g.pin, height: g.pin, borderRadius: g.pin / 2 },
            muted && !selected && styles.pinMuted,
            selected && styles.pinSelected,
          ]}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { width: PIN_WIDTH, alignItems: 'center' },
  tagRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tag: {
    height: TAG,
    paddingHorizontal: 7,
    borderRadius: t.radii.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    boxShadow: `0 2px 6px ${t.colors.shadow}`,
  },
  tagSelected: { height: TAG_SELECTED, paddingHorizontal: 8 },
  tagLive: { backgroundColor: t.colors.liveFill },
  tagTime: { backgroundColor: t.colors.inverse },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  tagText: { ...t.type.label, fontSize: 13, letterSpacing: 0.6 },
  tagTextSelected: { fontFamily: t.fonts.heavy, fontSize: 14 },
  tagTextLive: { color: '#FFFFFF', fontFamily: t.fonts.heavy, letterSpacing: 0.8 },
  tagTextTime: { color: t.colors.onInverse },
  box: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glow: { backgroundColor: t.colors.liveGlow },
  halo: { backgroundColor: t.colors.pinHalo },
  pin: {
    backgroundColor: t.colors.pin,
    borderWidth: 2,
    borderColor: t.colors.pinBorder,
    boxShadow: `0 2px 8px ${t.colors.shadow}`,
  },
  pinSelected: { borderWidth: 3, boxShadow: `0 4px 12px ${t.colors.shadow}` },
  pinMuted: { backgroundColor: t.colors.pinMuted, borderColor: t.colors.pinMutedBorder, boxShadow: 'none' },
}));
