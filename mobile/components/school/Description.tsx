import { Linking, Text, View } from 'react-native';
import type { BlockNode } from '@/lib/api/schools';
import { makeStyles } from '@/theme/ThemeProvider';

type Styles = ReturnType<typeof useStyles>;

/** Inline text: bold, italic, underline, strikethrough, code and links. */
function Inline({ nodes, styles }: { nodes: BlockNode[]; styles: Styles }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'link') {
          return (
            <Text key={i} style={styles.link} onPress={() => n.url && Linking.openURL(n.url)}>
              <Inline nodes={n.children ?? []} styles={styles} />
            </Text>
          );
        }
        return (
          <Text
            key={i}
            style={[
              !!n.bold && styles.bold,
              !!n.italic && styles.italic,
              !!n.underline && styles.underline,
              !!n.strikethrough && styles.strike,
              !!n.code && styles.code,
            ]}>
            {n.text ?? ''}
          </Text>
        );
      })}
    </>
  );
}

/** A small renderer for the Strapi `blocks` the school description uses (paragraphs, headings, lists, quotes). */
export function Description({ blocks }: { blocks: BlockNode[] | null }) {
  const styles = useStyles();
  if (!blocks?.length) return null;
  return (
    <View style={styles.wrap}>
      {blocks.map((b, i) => {
        const children = b.children ?? [];
        switch (b.type) {
          case 'heading':
            return (
              <Text key={i} style={styles.heading}>
                <Inline nodes={children} styles={styles} />
              </Text>
            );
          case 'list':
            return (
              <View key={i} style={styles.list}>
                {children.map((item, j) => (
                  <Text key={j} style={styles.p}>
                    {b.format === 'ordered' ? `${j + 1}. ` : '• '}
                    <Inline nodes={item.children ?? []} styles={styles} />
                  </Text>
                ))}
              </View>
            );
          case 'quote':
            return (
              <Text key={i} style={[styles.p, styles.quote]}>
                <Inline nodes={children} styles={styles} />
              </Text>
            );
          case 'code':
            return (
              <Text key={i} style={[styles.p, styles.codeBlock]}>
                <Inline nodes={children} styles={styles} />
              </Text>
            );
          default:
            return (
              <Text key={i} style={styles.p}>
                <Inline nodes={children} styles={styles} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: 12 },
  p: { ...t.type.body, fontSize: 16, lineHeight: 24, color: t.colors.chipText },
  heading: { ...t.type.heavy, fontSize: 20, color: t.colors.text },
  list: { gap: 4 },
  quote: { borderLeftWidth: 2, borderLeftColor: t.colors.outline, paddingLeft: 12, fontStyle: 'italic' },
  codeBlock: { backgroundColor: t.colors.separator, padding: 8, borderRadius: 6, fontFamily: 'monospace', fontSize: 14 },
  link: { color: t.colors.redText, textDecorationLine: 'underline' },
  bold: { fontFamily: t.fonts.bodyBold },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through' },
  code: { fontFamily: 'monospace' },
}));
