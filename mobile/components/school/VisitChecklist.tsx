import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { Card } from '@/components/kit';
import type { CheckItem } from '@/lib/week';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

/** "Can I train here tonight?": a tick, a cross or a question mark per fact, the key words in bold. */
export function VisitChecklist({ items }: { items: CheckItem[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Card padded={false} style={styles.card}>
      {items.map((item, i) => (
        <Fragment key={item.strong}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.row}>
            <View style={[styles.mark, item.ok === true ? styles.ok : item.ok === false ? styles.no : styles.unknown]}>
              <Ionicons
                name={item.ok === true ? 'checkmark' : item.ok === false ? 'close' : 'help'}
                size={14}
                color={item.ok === true ? '#FFFFFF' : colors.textSecondary}
                accessibilityLabel={item.ok === true ? 'Yes' : item.ok === false ? 'No' : 'Unknown'}
              />
            </View>
            <Text style={styles.text}>
              <Text style={styles.strong}>{item.strong}</Text>
              {item.rest}
            </Text>
          </View>
        </Fragment>
      ))}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { paddingHorizontal: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingVertical: 8 },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ok: { backgroundColor: t.colors.liveFill },
  no: { borderWidth: 1.5, borderColor: t.colors.outline },
  unknown: { borderWidth: 1.5, borderColor: t.colors.outline, borderStyle: 'dashed' },
  text: { ...t.type.body, flex: 1, fontSize: 15, color: t.colors.text },
  strong: { fontFamily: t.fonts.bodyBold },
  divider: { height: 1, backgroundColor: t.colors.separator, marginLeft: 32 },
}));
