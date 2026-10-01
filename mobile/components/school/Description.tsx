import { Linking, View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { BlockNode } from '@/lib/api/schools';
import { cn } from '@/lib/utils';

/** Inline text: bold, italic, underline, strikethrough, code and links. */
function Inline({ nodes }: { nodes: BlockNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'link') {
          return (
            <Text key={i} className="text-primary underline" onPress={() => n.url && Linking.openURL(n.url)}>
              <Inline nodes={n.children ?? []} />
            </Text>
          );
        }
        return (
          <Text
            key={i}
            className={cn(!!n.bold && 'font-bold', !!n.italic && 'italic', !!n.underline && 'underline', !!n.strikethrough && 'line-through', !!n.code && 'font-mono')}>
            {n.text ?? ''}
          </Text>
        );
      })}
    </>
  );
}

/** A small renderer for the Strapi `blocks` the school description uses (paragraphs, headings, lists, quotes). */
export function Description({ blocks }: { blocks: BlockNode[] | null }) {
  if (!blocks?.length) return null;
  return (
    <View className="gap-3">
      {blocks.map((b, i) => {
        const children = b.children ?? [];
        switch (b.type) {
          case 'heading':
            return (
              <Text key={i} className={cn('font-semibold', (b.level ?? 3) <= 2 ? 'text-xl' : 'text-lg')}>
                <Inline nodes={children} />
              </Text>
            );
          case 'list':
            return (
              <View key={i} className="gap-1">
                {children.map((item, j) => (
                  <Text key={j} className="leading-6">
                    {b.format === 'ordered' ? `${j + 1}. ` : '• '}
                    <Inline nodes={item.children ?? []} />
                  </Text>
                ))}
              </View>
            );
          case 'quote':
            return (
              <Text key={i} className="border-l-2 border-border pl-3 italic leading-6">
                <Inline nodes={children} />
              </Text>
            );
          case 'code':
            return (
              <Text key={i} className="rounded bg-muted p-2 font-mono text-sm">
                <Inline nodes={children} />
              </Text>
            );
          default:
            return (
              <Text key={i} className="leading-6">
                <Inline nodes={children} />
              </Text>
            );
        }
      })}
    </View>
  );
}
